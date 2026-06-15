/**
 * POST /api/grade
 *
 * Grading engine — adapts Exam_Grading.ipynb for per-assignment rubrics.
 *
 * Called automatically (fire-and-forget) by POST /api/submissions after a PDF
 * is saved. Can also be triggered manually by the instructor via the portal.
 *
 * Flow:
 *   submission saved → status = 'pending'
 *   this route runs  → status = 'ai_graded'  (AI result stored, NOT shown to student)
 *   instructor acts  → status = 'approved' | 'graded' | 'revision_requested'
 *   student sees grade only after instructor approves/modifies
 *
 * Auth: requires a valid session (student or instructor).
 * The caller's role is checked so students cannot trigger re-grades on others'
 * submissions, but instructors can grade any submission.
 */

import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth/next'
import { authOptions } from '@/lib/auth'
import { sql } from '@/lib/db'
import { assignments } from '@/lib/assignments'
import { gradeSubmission } from '@/lib/gemini'
import { getFileBuffer } from '@/lib/storage'
import path from 'path'

export const runtime = 'nodejs'

export async function POST(request: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
  const callerRole = (session.user as { role?: string }).role
  const callerId = (session.user as { id?: string }).id

  let body: { submissionId: string }
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
  }

  const { submissionId } = body
  if (!submissionId) {
    return NextResponse.json({ error: 'submissionId required' }, { status: 400 })
  }

  const { rows } = await sql`
    SELECT sub.*, st.owner_instructor_id
    FROM submissions sub
    JOIN students st ON st.id = sub.student_id
    WHERE sub.id = ${submissionId}
  `
  const submission = rows[0] as
    | {
        id: string
        student_id: string
        assignment_id: string
        file_name: string | null
        file_url: string | null
        status: string
        owner_instructor_id: string | null
      }
    | undefined

  if (!submission) {
    return NextResponse.json({ error: 'Submission not found' }, { status: 404 })
  }

  // Students can only trigger grading of their own submissions
  if (callerRole !== 'instructor' && submission.student_id !== callerId) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }
  if (callerRole === 'instructor' && submission.owner_instructor_id !== callerId) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  if (!submission.file_name) {
    return NextResponse.json({ error: 'No file attached to this submission' }, { status: 422 })
  }

  const assignment = assignments.find((a) => a.id === submission.assignment_id)
  if (!assignment) {
    return NextResponse.json({ error: 'Assignment not found' }, { status: 404 })
  }

  const filePointer =
    submission.file_url ??
    path.join(process.cwd(), 'uploads', submission.student_id, submission.file_name ?? '')

  try {
    const buffer = await getFileBuffer(filePointer)
    const result = await gradeSubmission(buffer, assignment)

    const feedback =
      result.overall_feedback +
      (result.confidence_notes !== 'None' ? `\n\nNote: ${result.confidence_notes}` : '')

    await sql`
      UPDATE submissions
      SET status = 'ai_graded',
          ai_grade = ${result.total_score},
          ai_feedback = ${feedback},
          ai_rubric_scores = ${JSON.stringify(result.rubric_scores)}
      WHERE id = ${submissionId}
    `

    return NextResponse.json({ ok: true, result })
  } catch (err) {
    console.error('[/api/grade] Gemini grading error:', err)
    return NextResponse.json(
      { error: 'AI grading failed', detail: String(err) },
      { status: 502 }
    )
  }
}
