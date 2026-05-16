'use client'

import { useSession, signOut } from 'next-auth/react'
import Link from 'next/link'

export default function NavBar() {
  const { data: session } = useSession()
  const role = (session?.user as { role?: string })?.role

  return (
    <header className="sticky top-0 z-50 border-b border-stone-200/80 bg-white/90 backdrop-blur-md">
      <div className="mx-auto flex max-w-6xl items-center justify-between px-4 sm:px-6 h-14">
        {/* Wordmark */}
        <Link
          href={role === 'instructor' ? '/instructor' : '/dashboard'}
          className="flex items-center gap-2.5 group"
        >
          <span className="flex h-7 w-7 items-center justify-center rounded-md bg-amber-700 text-white text-sm font-bold select-none">
            B
          </span>
          <span className="hidden sm:block font-semibold text-stone-800 tracking-tight group-hover:text-amber-700 transition-colors">
            Geology Basecamp
          </span>
          <span className="sm:hidden font-semibold text-stone-800 tracking-tight">
            Basecamp
          </span>
        </Link>

        <nav className="flex items-center gap-1">
          {role === 'instructor' && (
            <>
              <Link
                href="/instructor"
                className="rounded-md px-3 py-1.5 text-sm font-medium text-stone-500 hover:bg-stone-100 hover:text-stone-900 transition-colors"
              >
                Portal
              </Link>
              <Link
                href="/instructor/students"
                className="rounded-md px-3 py-1.5 text-sm font-medium text-stone-500 hover:bg-stone-100 hover:text-stone-900 transition-colors"
              >
                Students
              </Link>
              <Link
                href="/instructor/preview"
                className="rounded-md px-3 py-1.5 text-sm font-medium text-stone-500 hover:bg-stone-100 hover:text-stone-900 transition-colors"
              >
                Preview
              </Link>
            </>
          )}
          {role === 'student' && (
            <>
              <Link
                href="/dashboard"
                className="rounded-md px-3 py-1.5 text-sm font-medium text-stone-500 hover:bg-stone-100 hover:text-stone-900 transition-colors"
              >
                Dashboard
              </Link>
              <Link
                href="/account"
                className="rounded-md px-3 py-1.5 text-sm font-medium text-stone-500 hover:bg-stone-100 hover:text-stone-900 transition-colors"
              >
                Account
              </Link>
            </>
          )}

          {session && (
            <>
              <div className="mx-1 h-4 w-px bg-stone-200" />
              <span className="hidden sm:block text-sm text-stone-400 px-2">
                {session.user?.name}
              </span>
              <button
                onClick={() => signOut({ callbackUrl: '/login' })}
                className="rounded-md px-3 py-1.5 text-sm font-medium text-stone-500 hover:bg-stone-100 hover:text-stone-900 transition-colors"
              >
                Sign out
              </button>
            </>
          )}
        </nav>
      </div>
    </header>
  )
}
