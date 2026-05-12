import { redirect } from 'next/navigation'
import { getServerSession } from 'next-auth/next'
import { authOptions } from '@/lib/auth'

export default async function Home() {
  const session = await getServerSession(authOptions)
  if (!session) redirect('/login')
  const role = (session.user as { role?: string })?.role
  if (role === 'instructor') redirect('/instructor')
  redirect('/dashboard')
}


