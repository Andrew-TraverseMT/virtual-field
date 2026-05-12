import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth/next'
import { authOptions } from '@/lib/auth'
import { getDB } from '@/lib/db'
import { assignments } from '@/lib/assignments'
import { gradeSubmission } from '@/lib/gemini'
import { writeFile, mkdir } from 'fs/promises'
import path from 'path'
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
  const db = getDB()
  if (assignment.sequence > 1) {
    const prevAssignment = assignments.find((a) => a.sequence === assignment.sequence - 1)
    if (prevAssignment) {
      const prevSub = db
        .prepare('SELECT id FROM submissions WHERE student_id = ? AND assignment_id = ?')
        .get(studentId, prevAssignment.id)
      if (!prevSub) {
        return NextResponse.json(
          { error: 'Complete the previous assignment first' },
          { status: 403 }
        )
      }
    }
  }

  const file = formData.get('file') as File | null
  let fileName: string | null = null

  if (file && file.size > 0) {
    // Validate file type (PDF only)
    if (file.type !== 'application/pdf' && !file.name.toLowerCase().endsWith('.pdf')) {
      return NextResponse.json({ error: 'Only PDF files are accepted' }, { status: 400 })
    }
    // Validate file size (max 25 MB)
    if (file.size > 25 * 1024 * 1024) {
      return NextResponse.json({ error: 'File exceeds 25 MB limit' }, { status: 400 })
    }

    const uploadDir = path.join(process.cwd(), 'uploads', studentId)
    await mkdir(uploadDir, { recursive: true })

    const safeBase = `${assignmentId}-${Date.now()}.pdf`
    const filePath = path.join(uploadDir, safeBase)
    const buffer = Buffer.from(await file.arrayBuffer())
    await writeFile(filePath, buffer)
    fileName = safeBase
  }

  const submissionId = randomUUID()
  const now = Math.floor(Date.now() / 1000)

  // Get the real submission id (may already exist on resubmission)
  const existing = db
    .prepare('SELECT id FROM submissions WHERE student_id = ? AND assignment_id = ?')
    .get(studentId, assignmentId) as { id: string } | undefined

  const effectiveId = existing?.id ?? submissionId

  db.prepare(
    `INSERT INTO submissions (id, student_id, assignment_id, submitted_at, file_name, status)
     VALUES (?, ?, ?, ?, ?, 'pending')
     ON CONFLICT(student_id, assignment_id) DO UPDATE SET
       submitted_at = excluded.submitted_at,
       file_name = excluded.file_name,
       status = 'pending',
       ai_grade = NULL,
       ai_feedback = NULL,
       ai_rubric_scores = NULL`
  ).run(submissionId, studentId, assignmentId, now, fileName)

  // Fire-and-forget AI grading — runs in the background after response is sent.
  // The grade route updates status to 'ai_graded' when complete.
  // Students won't see the grade until an instructor approves it.
  if (fileName && process.env.GEMINI_API_KEY && process.env.GEMINI_API_KEY !== 'your_gemini_api_key_here') {
    const gradeFilePath = path.join(process.cwd(), 'uploads', studentId, fileName)
    const assignmentForGrade = assignment
    const idToGrade = effectiveId
    ;(async () => {
      try {
        const result = await gradeSubmission(gradeFilePath, assignmentForGrade)
        const db2 = getDB()
        db2
          .prepare(
            `UPDATE submissions
             SET status = 'ai_graded',
                 ai_grade = ?,
                 ai_feedback = ?,
                 ai_rubric_scores = ?
             WHERE id = ?`
          )
          .run(
            result.total_score,
            result.overall_feedback +
              (result.confidence_notes !== 'None' ? `\n\nNote: ${result.confidence_notes}` : ''),
            JSON.stringify(result.rubric_scores),
            idToGrade
          )
      } catch (err) {
        console.error('[submissions] Background grading failed:', err)
      }
    })()
  }

  return NextResponse.json({ ok: true, submissionId: effectiveId })
}
