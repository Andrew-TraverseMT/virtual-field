import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth/next'
import { authOptions } from '@/lib/auth'
import { sql } from '@/lib/db'

type Params = { params: Promise<{ submissionId: string }> }

export async function PATCH(request: NextRequest, { params }: Params) {
  const session = await getServerSession(authOptions)
  if (!session || (session.user as { role?: string }).role !== 'instructor') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }
  const instructorId = (session.user as { id?: string }).id
  if (!instructorId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
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

  const { rows } = await sql`
    SELECT sub.id
    FROM submissions sub
    JOIN students st ON st.id = sub.student_id
    WHERE sub.id = ${submissionId} AND st.owner_instructor_id = ${instructorId}
  `
  if (rows.length === 0) {
    return NextResponse.json({ error: 'Submission not found' }, { status: 404 })
  }

  const now = Math.floor(Date.now() / 1000)

  const statusMap = {
    approve: 'approved',
    modify: 'graded',
    request_revision: 'revision_requested',
  } as const

  await sql`
    UPDATE submissions
    SET status = ${statusMap[action]},
        instructor_grade = ${grade ?? null},
        instructor_notes = ${notes ?? null},
        instructor_reviewed_at = ${now}
    WHERE id = ${submissionId}
  `

  return NextResponse.json({ ok: true })
}
