import { NextRequest, NextResponse } from 'next/server'
import { randomBytes } from 'crypto'
import bcrypt from 'bcryptjs'
import { getServerSession } from 'next-auth/next'
import { authOptions } from '@/lib/auth'
import { sql } from '@/lib/db'
import type { RegisteredUser } from '@/lib/db'

export const runtime = 'nodejs'

function generateTempPassword(): string {
  const words = ['Oak', 'Pine', 'Rock', 'Lake', 'Peak', 'Rift', 'Mesa', 'Dune', 'Crag', 'Fold']
  const a = words[Math.floor(Math.random() * words.length)]
  const b = words[Math.floor(Math.random() * words.length)]
  const n1 = Math.floor(Math.random() * 9) + 1
  const n2 = Math.floor(Math.random() * 9) + 1
  return `${a}${n1}-${b}${n2}`
}

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if ((session?.user as { role?: string })?.role !== 'instructor') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const { studentId } = await req.json() as { studentId?: string }
  if (!studentId) {
    return NextResponse.json({ error: 'studentId required.' }, { status: 400 })
  }

  const { rows } = await sql`SELECT * FROM registered_users WHERE id = ${studentId}`
  const user = rows[0] as RegisteredUser | undefined

  if (!user) {
    return NextResponse.json({ error: 'Student not found.' }, { status: 404 })
  }

  const tempPassword = generateTempPassword()
  const passwordHash = await bcrypt.hash(tempPassword, 12)

  await sql`UPDATE registered_users SET password_hash = ${passwordHash} WHERE id = ${studentId}`
  await sql`UPDATE students SET temp_password = ${tempPassword} WHERE id = ${studentId}`
  await sql`DELETE FROM password_reset_tokens WHERE user_id = ${studentId}`

  return NextResponse.json({ ok: true, tempPassword })
}
