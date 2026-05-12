import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import bcrypt from 'bcryptjs'
import { authOptions } from '@/lib/auth'
import { getDB } from '@/lib/db'
import type { RegisteredUser } from '@/lib/db'

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session?.user?.email) {
    return NextResponse.json({ error: 'Not authenticated.' }, { status: 401 })
  }

  const { currentPassword, newPassword } = await req.json()
  if (typeof currentPassword !== 'string' || typeof newPassword !== 'string') {
    return NextResponse.json({ error: 'Invalid request.' }, { status: 400 })
  }
  if (newPassword.length < 8) {
    return NextResponse.json(
      { error: 'New password must be at least 8 characters.' },
      { status: 400 }
    )
  }

  const db = getDB()
  const user = db
    .prepare('SELECT * FROM registered_users WHERE email = ?')
    .get(session.user.email) as RegisteredUser | undefined

  if (!user) {
    return NextResponse.json(
      { error: 'Password changes are only available for @montana.edu accounts.' },
      { status: 403 }
    )
  }

  const valid = await bcrypt.compare(currentPassword, user.password_hash)
  if (!valid) {
    return NextResponse.json({ error: 'Current password is incorrect.' }, { status: 400 })
  }

  const hash = await bcrypt.hash(newPassword, 12)
  db.prepare('UPDATE registered_users SET password_hash = ? WHERE id = ?').run(hash, user.id)

  return NextResponse.json({ message: 'Password updated successfully.' })
}
