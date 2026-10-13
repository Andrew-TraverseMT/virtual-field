import type { Session } from 'next-auth'
import type { AppRole } from '@/lib/study-access'

export function sessionRole(session: Session | null): AppRole | null {
  const role = session?.user?.role
  if (role === 'student' || role === 'instructor' || role === 'consent_holder') return role
  return null
}

export function sessionUserId(session: Session | null): string | null {
  const id = session?.user?.id
  return typeof id === 'string' && id.length > 0 ? id : null
}

export function homeForRole(role: AppRole | null): string {
  if (role === 'instructor') return '/instructor/assignments'
  if (role === 'consent_holder') return '/consent'
  return '/dashboard'
}
