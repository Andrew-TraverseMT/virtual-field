import { NextRequest, NextResponse } from 'next/server'
import { randomBytes } from 'crypto'
import { sql } from '@/lib/db'
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
  const { rows } = await sql`SELECT * FROM registered_users WHERE email = ${email.toLowerCase().trim()} AND verified = 1`
  const user = rows[0] as RegisteredUser | undefined

  if (user) {
    // Delete any existing reset token for this user
    await sql`DELETE FROM password_reset_tokens WHERE user_id = ${user.id}`

    const token = randomBytes(32).toString('hex')
    const now = Math.floor(Date.now() / 1000)
    await sql`INSERT INTO password_reset_tokens (token, user_id, created_at) VALUES (${token}, ${user.id}, ${now})`

    await sendPasswordResetEmail(user.email, user.name, token)
  }

  return NextResponse.json({
    message: 'If that email is registered, a reset link has been sent.',
  })
}
