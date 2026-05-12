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
import { getDB } from '@/lib/db'
import { assignments } from '@/lib/assignments'
import { gradeSubmission } from '@/lib/gemini'
import path from 'path'

export const runtime = 'nodejs'

export async function POST(request: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

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

  const db = getDB()
  const submission = db
    .prepare('SELECT * FROM submissions WHERE id = ?')
    .get(submissionId) as
    | {
        id: string
        student_id: string
        assignment_id: string
        file_name: string | null
        status: string
      }
    | undefined

  if (!submission) {
    return NextResponse.json({ error: 'Submission not found' }, { status: 404 })
  }

  // Students can only trigger grading of their own submissions
  const callerRole = (session.user as { role?: string }).role
  const callerId = (session.user as { id?: string }).id
  if (callerRole !== 'instructor' && submission.student_id !== callerId) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  if (!submission.file_name) {
    return NextResponse.json({ error: 'No file attached to this submission' }, { status: 422 })
  }

  const assignment = assignments.find((a) => a.id === submission.assignment_id)
  if (!assignment) {
    return NextResponse.json({ error: 'Assignment not found' }, { status: 404 })
  }

  const filePath = path.join(
    process.cwd(),
    'uploads',
    submission.student_id,
    submission.file_name
  )

  try {
    const result = await gradeSubmission(filePath, assignment)

    db.prepare(
      `UPDATE submissions
       SET status = 'ai_graded',
           ai_grade = ?,
           ai_feedback = ?,
           ai_rubric_scores = ?
       WHERE id = ?`
    ).run(
      result.total_score,
      result.overall_feedback + (result.confidence_notes !== 'None' ? `\n\nNote: ${result.confidence_notes}` : ''),
      JSON.stringify(result.rubric_scores),
      submissionId
    )

    return NextResponse.json({ ok: true, result })
  } catch (err) {
    console.error('[/api/grade] Gemini grading error:', err)
    return NextResponse.json(
      { error: 'AI grading failed', detail: String(err) },
      { status: 502 }
    )
  }
}
