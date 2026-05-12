import { NextRequest, NextResponse } from 'next/server'
import { randomBytes } from 'crypto'
import bcrypt from 'bcryptjs'
import { getDB } from '@/lib/db'
import { sendVerificationEmail } from '@/lib/email'
import { rateLimit, getClientIp } from '@/lib/rateLimit'

export const runtime = 'nodejs'

export async function POST(req: NextRequest) {
  const ip = getClientIp(req.headers)
  const rl = rateLimit(`register:${ip}`, 5, 15 * 60 * 1000)
  if (!rl.ok) {
    return NextResponse.json(
      { error: `Too many registration attempts. Try again in ${rl.retryAfterSec}s.` },
      { status: 429 }
    )
  }

  const { name, email, password } = await req.json() as {
    name?: string
    email?: string
    password?: string
  }

  // Validate inputs
  if (!name?.trim() || !email?.trim() || !password) {
    return NextResponse.json({ error: 'All fields are required.' }, { status: 400 })
  }

  if (!email.toLowerCase().endsWith('@montana.edu')) {
    return NextResponse.json(
      { error: 'Registration is restricted to @montana.edu email addresses.' },
      { status: 403 }
    )
  }

  if (password.length < 8) {
    return NextResponse.json(
      { error: 'Password must be at least 8 characters.' },
      { status: 400 }
    )
  }

  const db = getDB()
  const normalizedEmail = email.toLowerCase().trim()

  // Check for existing verified account
  const existing = db
    .prepare('SELECT id, verified FROM registered_users WHERE email = ?')
    .get(normalizedEmail) as { id: string; verified: number } | undefined

  if (existing?.verified) {
    return NextResponse.json(
      { error: 'An account with this email already exists.' },
      { status: 409 }
    )
  }

  const passwordHash = await bcrypt.hash(password, 12)
  const token = randomBytes(32).toString('hex')
  const now = Math.floor(Date.now() / 1000)

  if (existing) {
    // Re-send verification for an unverified account
    db.prepare(
      `UPDATE registered_users
       SET name = ?, password_hash = ?, verification_token = ?, created_at = ?
       WHERE id = ?`
    ).run(name.trim(), passwordHash, token, now, existing.id)
  } else {
    const id = `user-${randomBytes(8).toString('hex')}`
    db.prepare(
      `INSERT INTO registered_users (id, name, email, password_hash, verification_token, created_at)
       VALUES (?, ?, ?, ?, ?, ?)`
    ).run(id, name.trim(), normalizedEmail, passwordHash, token, now)
  }

  await sendVerificationEmail(normalizedEmail, name.trim(), token)

  return NextResponse.json({ ok: true })
}
