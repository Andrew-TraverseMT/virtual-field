import { NextRequest, NextResponse } from 'next/server'
import bcrypt from 'bcryptjs'
import { getDB } from '@/lib/db'

const TOKEN_TTL_SEC = 60 * 60 // 1 hour

export async function POST(req: NextRequest) {
  const { token, password } = await req.json()

  if (typeof token !== 'string' || token.length < 10) {
    return NextResponse.json({ error: 'Invalid request.' }, { status: 400 })
  }
  if (typeof password !== 'string' || password.length < 8) {
    return NextResponse.json(
      { error: 'Password must be at least 8 characters.' },
      { status: 400 }
    )
  }

  const db = getDB()
  const row = db
    .prepare('SELECT * FROM password_reset_tokens WHERE token = ?')
    .get(token) as { token: string; user_id: string; created_at: number } | undefined

  if (!row) {
    return NextResponse.json(
      { error: 'This reset link is invalid or has already been used.' },
      { status: 400 }
    )
  }

  const nowSec = Math.floor(Date.now() / 1000)
  if (nowSec - row.created_at > TOKEN_TTL_SEC) {
    db.prepare('DELETE FROM password_reset_tokens WHERE token = ?').run(token)
    return NextResponse.json(
      { error: 'This reset link has expired. Please request a new one.' },
      { status: 400 }
    )
  }

  const hash = await bcrypt.hash(password, 12)
  db.prepare('UPDATE registered_users SET password_hash = ? WHERE id = ?').run(hash, row.user_id)
  db.prepare('DELETE FROM password_reset_tokens WHERE token = ?').run(token)

  return NextResponse.json({ message: 'Password updated. You can now log in.' })
}
