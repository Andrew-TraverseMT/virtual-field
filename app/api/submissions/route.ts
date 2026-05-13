import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth/next'
import { authOptions } from '@/lib/auth'
import { sql } from '@/lib/db'
import { assignments } from '@/lib/assignments'
import { gradeSubmission } from '@/lib/gemini'
import { storeFile } from '@/lib/storage'
import { randomUUID } from 'crypto'

export async function POST(request: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const studentId = (session.user as { id?: string }).id ?? 'student-001'

  let formData: FormData
  try {
    formData = await request.formData()
  } catch {
    return NextResponse.json({ error: 'Invalid form data' }, { status: 400 })
  }

  const assignmentId = formData.get('assignmentId')?.toString()
  if (!assignmentId) {
    return NextResponse.json({ error: 'assignmentId is required' }, { status: 400 })
  }

  // Validate assignment exists
  const assignment = assignments.find((a) => a.id === assignmentId)
  if (!assignment) {
    return NextResponse.json({ error: 'Assignment not found' }, { status: 404 })
  }

  // Enforce sequential unlocking
  if (assignment.sequence > 1) {
    const prevAssignment = assignments.find((a) => a.sequence === assignment.sequence - 1)
    if (prevAssignment) {
      const { rows: prevRows } = await sql`SELECT id FROM submissions WHERE student_id = ${studentId} AND assignment_id = ${prevAssignment.id}`
      if (prevRows.length === 0) {
        return NextResponse.json(
          { error: 'Complete the previous assignment first' },
          { status: 403 }
        )
      }
    }
  }

  // Enforce submission deadline (skip for instructors)
  const callerRole = (session.user as { role?: string }).role
  if (callerRole !== 'instructor') {
    const { rows: stuRows } = await sql`SELECT deadline_at FROM students WHERE id = ${studentId}`
    const stu = stuRows[0] as { deadline_at: number | null } | undefined
    const nowSec = Math.floor(Date.now() / 1000)
    if (stu?.deadline_at && stu.deadline_at < nowSec) {
      return NextResponse.json(
        { error: 'The submission deadline for your cohort has passed.' },
        { status: 403 }
      )
    }
  }

  const file = formData.get('file') as File | null
  let fileName: string | null = null
  let fileUrl: string | null = null
  let gradeBuffer: Buffer | null = null

  if (file && file.size > 0) {
    // Validate file type (PDF only)
    if (file.type !== 'application/pdf' && !file.name.toLowerCase().endsWith('.pdf')) {
      return NextResponse.json({ error: 'Only PDF files are accepted' }, { status: 400 })
    }
    // Validate file size (max 25 MB)
    if (file.size > 25 * 1024 * 1024) {
      return NextResponse.json({ error: 'File exceeds 25 MB limit' }, { status: 400 })
    }

    const safeBase = `${assignmentId}-${Date.now()}.pdf`
    gradeBuffer = Buffer.from(await file.arrayBuffer())
    fileUrl = await storeFile(gradeBuffer, studentId, safeBase)
    fileName = file.name
  }

  const submissionId = randomUUID()
  const now = Math.floor(Date.now() / 1000)

  // Get the real submission id (may already exist on resubmission)
  const { rows: existingRows } = await sql`SELECT id FROM submissions WHERE student_id = ${studentId} AND assignment_id = ${assignmentId}`
  const existing = existingRows[0] as { id: string } | undefined

  const effectiveId = existing?.id ?? submissionId

  await sql`
    INSERT INTO submissions (id, student_id, assignment_id, submitted_at, file_name, file_url, status)
    VALUES (${submissionId}, ${studentId}, ${assignmentId}, ${now}, ${fileName}, ${fileUrl}, 'pending')
    ON CONFLICT(student_id, assignment_id) DO UPDATE SET
      submitted_at = EXCLUDED.submitted_at,
      file_name = EXCLUDED.file_name,
      file_url = EXCLUDED.file_url,
      status = 'pending',
      ai_grade = NULL,
      ai_feedback = NULL,
      ai_rubric_scores = NULL
  `

  // Fire-and-forget AI grading — runs in the background after response is sent.
  // The grade route updates status to 'ai_graded' when complete.
  // Students won't see the grade until an instructor approves it.
  if (fileUrl && gradeBuffer && process.env.GEMINI_API_KEY && process.env.GEMINI_API_KEY !== 'your_gemini_api_key_here') {
    const bufferForGrade = gradeBuffer
    const assignmentForGrade = assignment
    const idToGrade = effectiveId
    ;(async () => {
      try {
        const result = await gradeSubmission(bufferForGrade, assignmentForGrade)
        const feedback =
          result.overall_feedback +
          (result.confidence_notes !== 'None' ? `\n\nNote: ${result.confidence_notes}` : '')
        await sql`
          UPDATE submissions
          SET status = 'ai_graded',
              ai_grade = ${result.total_score},
              ai_feedback = ${feedback},
              ai_rubric_scores = ${JSON.stringify(result.rubric_scores)}
          WHERE id = ${idToGrade}
        `
      } catch (err) {
        console.error('[submissions] Background grading failed:', err)
      }
    })()
  }

  return NextResponse.json({ ok: true, submissionId: effectiveId })
}
