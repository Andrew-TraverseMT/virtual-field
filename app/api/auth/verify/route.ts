import { NextRequest, NextResponse } from 'next/server'
import { sql } from '@/lib/db'
import type { RegisteredUser } from '@/lib/db'

export const runtime = 'nodejs'

export async function GET(req: NextRequest) {
  const token = req.nextUrl.searchParams.get('token')

  if (!token) {
    return NextResponse.redirect(new URL('/login?error=invalid_token', req.url))
  }

  const { rows } = await sql`SELECT * FROM registered_users WHERE verification_token = ${token}`
  const user = rows[0] as RegisteredUser | undefined

  if (!user) {
    return NextResponse.redirect(new URL('/login?error=invalid_token', req.url))
  }

  // Tokens expire after 24 hours
  const age = Math.floor(Date.now() / 1000) - user.created_at
  if (age > 86400) {
    return NextResponse.redirect(new URL('/login?error=token_expired', req.url))
  }

  if (user.verified) {
    return NextResponse.redirect(new URL('/login?verified=1', req.url))
  }

  // Mark verified and clear token
  await sql`UPDATE registered_users SET verified = 1, verification_token = NULL WHERE id = ${user.id}`

  // Create student record so the rest of the app works
  const now = Math.floor(Date.now() / 1000)
  const threeWeeks = 21 * 24 * 60 * 60
  const { rows: existingStudentRows } = await sql`SELECT id FROM students WHERE email = ${user.email}`

  if (existingStudentRows.length === 0) {
    await sql`
      INSERT INTO students (id, name, email, enrolled_at, deadline_at)
      VALUES (${user.id}, ${user.name}, ${user.email}, ${now}, ${now + threeWeeks})
    `
  }

  return NextResponse.redirect(new URL('/login?verified=1', req.url))
}
