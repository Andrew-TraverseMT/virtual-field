'use client'

import { useSession } from 'next-auth/react'
import { usePathname, useRouter } from 'next/navigation'
import { useEffect } from 'react'

/** Backup for the server redirect. A session that still must change its password cannot stay on another page. */
export default function PasswordGate() {
  const { data: session, status } = useSession()
  const pathname = usePathname()
  const router = useRouter()

  useEffect(() => {
    if (status !== 'authenticated') return
    if (session?.user?.mustChangePassword && pathname !== '/account/password') {
      router.replace('/account/password')
    }
  }, [session, status, pathname, router])

  return null
}
