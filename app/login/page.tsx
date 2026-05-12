'use client'

import { useState } from 'react'
import { signIn } from 'next-auth/react'
import { useRouter } from 'next/navigation'

export default function LoginPage() {
  const router = useRouter()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

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

    router.push('/')
  }

  return (
    <div className="flex flex-1 items-center justify-center px-4 py-16">
      <div className="w-full max-w-sm">
        {/* Brand mark */}
        <div className="mb-8 text-center">
          <div className="mb-3 text-5xl">🗺️</div>
          <h1 className="text-2xl font-bold text-stone-800">Virtual Field Camp</h1>
          <p className="mt-1 text-sm text-stone-500">3-week virtual geology field experience</p>
        </div>

        <div className="rounded-xl border border-stone-200 bg-white p-8 shadow-sm">
          <h2 className="mb-6 text-lg font-semibold text-stone-700">Sign in</h2>

          <form onSubmit={handleSubmit} className="flex flex-col gap-4">
            <div>
              <label className="mb-1 block text-sm font-medium text-stone-600" htmlFor="email">
                Email
              </label>
              <input
                id="email"
                type="email"
                required
                autoComplete="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full rounded-lg border border-stone-300 px-3 py-2 text-sm outline-none focus:border-amber-500 focus:ring-2 focus:ring-amber-200"
                placeholder="you@example.com"
              />
            </div>

            <div>
              <label className="mb-1 block text-sm font-medium text-stone-600" htmlFor="password">
                Password
              </label>
              <input
                id="password"
                type="password"
                required
                autoComplete="current-password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full rounded-lg border border-stone-300 px-3 py-2 text-sm outline-none focus:border-amber-500 focus:ring-2 focus:ring-amber-200"
                placeholder="••••••••"
              />
            </div>

            {error && (
              <p className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-600">{error}</p>
            )}

            <button
              type="submit"
              disabled={loading}
              className="mt-2 w-full rounded-lg bg-amber-600 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-amber-700 disabled:opacity-60"
            >
              {loading ? 'Signing in…' : 'Sign in'}
            </button>
          </form>
        </div>

        <p className="mt-4 text-center text-xs text-stone-400">
          Demo — student@virtualfield.dev / test1234
        </p>
      </div>
    </div>
  )
}
