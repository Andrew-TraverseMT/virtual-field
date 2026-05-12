'use client'

import { useSession, signOut } from 'next-auth/react'
import Link from 'next/link'

export default function NavBar() {
  const { data: session } = useSession()
  const role = (session?.user as { role?: string })?.role

  return (
    <header className="sticky top-0 z-50 border-b border-stone-200 bg-white/95 backdrop-blur-sm">
      <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-3">
        <Link href="/dashboard" className="flex items-center gap-2 font-semibold text-stone-800">
          <span className="text-lg">🗺️</span>
          <span>Virtual Field Camp</span>
        </Link>

        <nav className="flex items-center gap-4">
          {role === 'instructor' && (
            <Link
              href="/instructor"
              className="text-sm font-medium text-stone-600 hover:text-stone-900"
            >
              Instructor Portal
            </Link>
          )}
          {role === 'student' && (
            <Link
              href="/dashboard"
              className="text-sm font-medium text-stone-600 hover:text-stone-900"
            >
              My Dashboard
            </Link>
          )}
          {session && (
            <div className="flex items-center gap-3">
              <span className="hidden text-sm text-stone-500 sm:block">
                {session.user?.name}
              </span>
              <button
                onClick={() => signOut({ callbackUrl: '/login' })}
                className="rounded-md border border-stone-300 px-3 py-1.5 text-sm font-medium text-stone-600 hover:bg-stone-50"
              >
                Sign out
              </button>
            </div>
          )}
        </nav>
      </div>
    </header>
  )
}
