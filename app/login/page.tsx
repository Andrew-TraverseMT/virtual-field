import { Suspense } from 'react'
import { LoginForm } from './LoginForm'
import { getServerSession } from 'next-auth/next'
import { authOptions } from '@/lib/auth'
import { redirect } from 'next/navigation'
import { homeForRole, mustChangePassword, sessionRole } from '@/lib/session'

export default async function LoginPage() {
  const session = await getServerSession(authOptions)
  if (session) {
    redirect(homeForRole(sessionRole(session), mustChangePassword(session)))
  }

  return (
    <Suspense>
      <LoginForm />
    </Suspense>
  )
}
