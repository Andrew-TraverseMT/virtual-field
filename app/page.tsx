import { redirect } from 'next/navigation'
import { getServerSession } from 'next-auth/next'
import { authOptions } from '@/lib/auth'
import { homeForRole, mustChangePassword, sessionRole } from '@/lib/session'

export default async function Home() {
  const session = await getServerSession(authOptions)
  if (!session) redirect('/login')
  redirect(homeForRole(sessionRole(session), mustChangePassword(session)))
}


