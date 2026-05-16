import { Suspense } from 'react'
import { LoginForm } from './LoginForm'
import { getServerSession } from 'next-auth/next'
import { authOptions } from '@/lib/auth'
import { redirect } from 'next/navigation'

export default async function LoginPage() {
  const session = await getServerSession(authOptions)
  if (session) {
    const role = (session.user as { role?: string })?.role
    redirect(role === 'instructor' ? '/instructor' : '/dashboard')
  }

  return (
    <Suspense>
      <LoginForm />
    </Suspense>
  )
}
