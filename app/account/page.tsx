import { getServerSession } from 'next-auth/next'
import { redirect } from 'next/navigation'
import { authOptions } from '@/lib/auth'
import { mustChangePassword } from '@/lib/session'
import AccountForm from './AccountForm'

export default async function AccountPage() {
  const session = await getServerSession(authOptions)
  if (!session) redirect('/login')
  if (mustChangePassword(session)) redirect('/account/password')

  return <AccountForm email={session.user?.email} />
}
