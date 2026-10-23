import { getServerSession } from 'next-auth/next'
import { redirect } from 'next/navigation'
import { authOptions } from '@/lib/auth'
import { homeForRole, mustChangePassword, sessionRole } from '@/lib/session'
import AccountForm from '../AccountForm'

export default async function SetPasswordPage() {
  const session = await getServerSession(authOptions)
  if (!session) redirect('/login')
  if (!mustChangePassword(session)) redirect(homeForRole(sessionRole(session)))

  return <AccountForm email={session.user?.email} forced />
}
