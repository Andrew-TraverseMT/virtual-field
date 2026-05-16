import { NextRequest, NextResponse } from 'next/server'
import { randomBytes } from 'crypto'
import bcrypt from 'bcryptjs'
import { getServerSession } from 'next-auth/next'
import { authOptions } from '@/lib/auth'
import { sql } from '@/lib/db'


export const runtime = 'nodejs'

/** Generate a readable temporary password like "Pine7-Rock3" */
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

  const { name, email, startDate } = await req.json() as { name?: string; email?: string; startDate?: string }

  if (!name?.trim() || !email?.trim()) {
    return NextResponse.json({ error: 'Name and email are required.' }, { status: 400 })
  }

  // Compute deadline: 3 weeks from startDate (YYYY-MM-DD) if provided, else from now
  const baseTs = startDate
    ? Math.floor(new Date(startDate + 'T00:00:00').getTime() / 1000)
    : Math.floor(Date.now() / 1000)
  if (startDate && isNaN(baseTs * 1000)) {
    return NextResponse.json({ error: 'Invalid start date.' }, { status: 400 })
  }

  const normalizedEmail = email.toLowerCase().trim()

  // Check for existing account in both tables (registered_users for normal accounts,
  // students for the hardcoded test student and any direct roster entries)
  const { rows: existing } = await sql`
    SELECT id FROM registered_users WHERE email = ${normalizedEmail}
    UNION
    SELECT id FROM students WHERE email = ${normalizedEmail}
  `
  if (existing.length > 0) {
    return NextResponse.json({ error: 'An account with this email already exists.' }, { status: 409 })
  }

  const id = `user-${randomBytes(8).toString('hex')}`
  const tempPassword = generateTempPassword()
  const passwordHash = await bcrypt.hash(tempPassword, 12)
  const now = Math.floor(Date.now() / 1000)
  const threeWeeks = 21 * 24 * 60 * 60

  // Create auth record (pre-verified — no email confirmation step)
  await sql`
    INSERT INTO registered_users (id, name, email, password_hash, verified, created_at)
    VALUES (${id}, ${name.trim()}, ${normalizedEmail}, ${passwordHash}, 1, ${now})
  `

  // Create enrollment record (drives submission FK and student roster)
  await sql`
    INSERT INTO students (id, name, email, enrolled_at, deadline_at, temp_password)
    VALUES (${id}, ${name.trim()}, ${normalizedEmail}, ${now}, ${baseTs + threeWeeks}, ${tempPassword})
    ON CONFLICT (id) DO NOTHING
  `

  return NextResponse.json({ ok: true, tempPassword })
}
