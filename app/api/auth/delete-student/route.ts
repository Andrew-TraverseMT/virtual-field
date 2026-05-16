import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth/next'
import { authOptions } from '@/lib/auth'
import { sql } from '@/lib/db'

export const runtime = 'nodejs'

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if ((session?.user as { role?: string })?.role !== 'instructor') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const { studentId, force } = await req.json() as { studentId?: string; force?: boolean }
  if (!studentId) {
    return NextResponse.json({ error: 'studentId required.' }, { status: 400 })
  }

  // Prevent accidental deletion of students with graded/approved work unless explicitly forced.
  if (!force) {
    const { rows: gradedRows } = await sql`
      SELECT COUNT(*)::int AS count FROM submissions
      WHERE student_id = ${studentId}
        AND status IN ('approved', 'graded', 'ai_graded', 'revision_requested')
    `
    const gradedCount = (gradedRows[0] as { count: number }).count
    if (gradedCount > 0) {
      return NextResponse.json(
        { error: `This student has ${gradedCount} graded submission(s). Pass force: true to confirm permanent deletion.`, gradedCount },
        { status: 409 }
      )
    }
  }

  // Delete submissions first (FK constraint), then auth record, then roster entry
  await sql`DELETE FROM submissions WHERE student_id = ${studentId}`
  await sql`DELETE FROM password_reset_tokens WHERE user_id = ${studentId}`
  await sql`DELETE FROM registered_users WHERE id = ${studentId}`
  await sql`DELETE FROM students WHERE id = ${studentId}`

  return NextResponse.json({ ok: true })
}
