import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth/next'
import { authOptions } from '@/lib/auth'
import { getDB } from '@/lib/db'

type Params = { params: Promise<{ submissionId: string }> }

export async function PATCH(request: NextRequest, { params }: Params) {
  const session = await getServerSession(authOptions)
  if (!session || (session.user as { role?: string }).role !== 'instructor') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const { submissionId } = await params

  let body: {
    action: 'approve' | 'modify' | 'request_revision'
    grade?: number
    notes?: string
  }
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
  }

  const { action, grade, notes } = body

  const db = getDB()
  const existing = db
    .prepare('SELECT id FROM submissions WHERE id = ?')
    .get(submissionId)
  if (!existing) {
    return NextResponse.json({ error: 'Submission not found' }, { status: 404 })
  }

  const now = Math.floor(Date.now() / 1000)

  const statusMap = {
    approve: 'approved',
    modify: 'graded',
    request_revision: 'revision_requested',
  } as const

  db.prepare(
    `UPDATE submissions
     SET status = ?,
         instructor_grade = ?,
         instructor_notes = ?,
         instructor_reviewed_at = ?
     WHERE id = ?`
  ).run(statusMap[action], grade ?? null, notes ?? null, now, submissionId)

  return NextResponse.json({ ok: true })
}
