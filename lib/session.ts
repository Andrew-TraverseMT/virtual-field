import { NextResponse } from 'next/server'
import type { Session } from 'next-auth'
import type { AppRole } from '@/lib/study-access'

export function sessionRole(session: Session | null): AppRole | null {
  const role = session?.user?.role
  if (role === 'student' || role === 'instructor' || role === 'researcher') return role
  return null
}

export function mustChangePassword(session: Session | null): boolean {
  return session?.user?.mustChangePassword === true
}

export function passwordChangeAllowedPath(pathname: string): boolean {
  return pathname === '/account/password'
}

export function blockIfPasswordChangeRequired(session: Session | null): NextResponse | null {
  if (!mustChangePassword(session)) return null
  return NextResponse.json({ error: 'Set a new password before continuing.' }, { status: 403 })
}

export function sessionUserId(session: Session | null): string | null {
  const id = session?.user?.id
  return typeof id === 'string' && id.length > 0 ? id : null
}

export function homeForRole(role: AppRole | null, needsPasswordChange = false): string {
  if (needsPasswordChange) return '/account/password'
  if (role === 'instructor') return '/instructor/assignments'
  if (role === 'researcher') return '/consent'
  return '/dashboard'
}
