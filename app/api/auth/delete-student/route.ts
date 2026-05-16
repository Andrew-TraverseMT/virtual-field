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

  const { studentId } = await req.json() as { studentId?: string }
  if (!studentId) {
    return NextResponse.json({ error: 'studentId required.' }, { status: 400 })
  }

  // Delete submissions first (FK constraint), then auth record, then roster entry
  await sql`DELETE FROM submissions WHERE student_id = ${studentId}`
  await sql`DELETE FROM password_reset_tokens WHERE user_id = ${studentId}`
  await sql`DELETE FROM registered_users WHERE id = ${studentId}`
  await sql`DELETE FROM students WHERE id = ${studentId}`

  return NextResponse.json({ ok: true })
}
