'use client'

import { useState } from 'react'
import { signIn } from 'next-auth/react'
import { useRouter, useSearchParams } from 'next/navigation'
import Link from 'next/link'

export function LoginForm({ studentPassword, instructorPassword }: { studentPassword: string; instructorPassword: string }) {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const verified = searchParams.get('verified') === '1'
  const tokenError = searchParams.get('error')

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    setLoading(true)

    const result = await signIn('credentials', {
      email,
      password,
      redirect: false,
    })

    setLoading(false)

    if (result?.error) {
      setError('Invalid email or password.')
      return
    }

    router.refresh()
    router.push('/')
  }

  return (
    <div className="flex flex-1 items-center justify-center px-4 py-20 bg-[#f8f7f4]">
      <div className="w-full max-w-sm">

        {/* Brand mark */}
        <div className="mb-10 text-center">
          <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-xl bg-amber-700 text-white text-xl font-bold shadow-sm">
            B
          </div>
          <h1 className="text-xl font-semibold tracking-tight text-stone-900">
            Virtual Field Geology Basecamp
          </h1>
          <p className="mt-1.5 text-sm text-stone-400">
            3-week virtual geology field experience
          </p>
        </div>

        {/* Verification banner */}
        {verified && (
          <div className="mb-4 rounded-xl border border-emerald-100 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">
            Email verified — you can now sign in.
          </div>
        )}
        {tokenError === 'token_expired' && (
          <div className="mb-4 rounded-xl border border-red-100 bg-red-50 px-4 py-3 text-sm text-red-600">
            That link has expired. <Link href="/register" className="font-medium underline">Register again</Link> to get a new one.
          </div>
        )}
        {tokenError === 'invalid_token' && (
          <div className="mb-4 rounded-xl border border-red-100 bg-red-50 px-4 py-3 text-sm text-red-600">
            Invalid or already-used verification link.
          </div>
        )}

        {/* Card */}
        <div className="rounded-2xl border border-stone-200 bg-white px-8 py-8 shadow-sm">
          <h2 className="mb-6 text-sm font-semibold uppercase tracking-wider text-stone-400">
            Sign in
          </h2>

          <form onSubmit={handleSubmit} className="flex flex-col gap-5">
            <div>
              <label className="mb-1.5 block text-sm font-medium text-stone-700" htmlFor="email">
                Email address
              </label>
              <input
                id="email"
                type="email"
                required
                autoComplete="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full rounded-lg border border-stone-200 bg-stone-50 px-3.5 py-2.5 text-sm text-stone-900 placeholder:text-stone-400 outline-none transition focus:border-amber-500 focus:bg-white focus:ring-2 focus:ring-amber-100"
                placeholder="you@example.com"
              />
            </div>

            <div>
              <label className="mb-1.5 block text-sm font-medium text-stone-700" htmlFor="password">
                Password
              </label>
              <input
                id="password"
                type="password"
                required
                autoComplete="current-password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full rounded-lg border border-stone-200 bg-stone-50 px-3.5 py-2.5 text-sm text-stone-900 placeholder:text-stone-400 outline-none transition focus:border-amber-500 focus:bg-white focus:ring-2 focus:ring-amber-100"
                placeholder="••••••••"
              />
              <div className="mt-1.5 text-right">
                <Link href="/forgot-password"
                  className="text-xs text-amber-700 hover:text-amber-800 font-medium">
                  Forgot password?
                </Link>
              </div>
            </div>

            {error && (
              <p className="rounded-lg border border-red-100 bg-red-50 px-3.5 py-2.5 text-sm text-red-600">
                {error}
              </p>
            )}

            <button
              type="submit"
              disabled={loading}
              className="mt-1 w-full rounded-lg bg-amber-700 px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-amber-800 active:scale-[0.98] disabled:opacity-60"
            >
              {loading ? 'Signing in…' : 'Sign in →'}
            </button>
          </form>
        </div>

        <p className="mt-4 text-center text-sm text-stone-400">
          Montana University student?{' '}
          <Link href="/register" className="font-medium text-amber-700 hover:text-amber-800">
            Create an account
          </Link>
        </p>

        {/* Demo credentials */}
        <div className="mt-4 rounded-lg border border-dashed border-stone-200 bg-white/60 px-4 py-3">
          <p className="text-xs font-medium text-stone-500 mb-1">Demo credentials</p>
          <p className="text-xs text-stone-400 font-mono">student@virtualfield.dev / {studentPassword}</p>
          <p className="text-xs text-stone-400 font-mono mt-0.5">instructor@virtualfield.dev / {instructorPassword}</p>
        </div>
      </div>
    </div>
  )
}
