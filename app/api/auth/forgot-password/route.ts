import { NextRequest, NextResponse } from 'next/server'
import { randomBytes } from 'crypto'
import { getDB } from '@/lib/db'
import { sendPasswordResetEmail } from '@/lib/email'
import { rateLimit, getClientIp } from '@/lib/rateLimit'
import type { RegisteredUser } from '@/lib/db'

export async function POST(req: NextRequest) {
  const ip = getClientIp(req.headers)
  const rl = rateLimit(`forgot-password:${ip}`, 5, 15 * 60 * 1000)
  if (!rl.ok) {
    return NextResponse.json(
      { error: `Too many requests. Try again in ${rl.retryAfterSec}s.` },
      { status: 429 }
    )
  }

  const { email } = await req.json()
  if (typeof email !== 'string' || !email.includes('@')) {
    return NextResponse.json({ error: 'Invalid email.' }, { status: 400 })
  }

  // Always return 200 to prevent email enumeration
  const db = getDB()
  const user = db
    .prepare('SELECT * FROM registered_users WHERE email = ? AND verified = 1')
    .get(email.toLowerCase().trim()) as RegisteredUser | undefined

  if (user) {
    // Delete any existing reset token for this user
    db.prepare('DELETE FROM password_reset_tokens WHERE user_id = ?').run(user.id)

    const token = randomBytes(32).toString('hex')
    const now = Math.floor(Date.now() / 1000)
    db.prepare('INSERT INTO password_reset_tokens (token, user_id, created_at) VALUES (?, ?, ?)')
      .run(token, user.id, now)

    await sendPasswordResetEmail(user.email, user.name, token)
  }

  return NextResponse.json({
    message: 'If that email is registered, a reset link has been sent.',
  })
}
