'use client'

import { useState, Suspense } from 'react'
import { useSearchParams, useRouter } from 'next/navigation'
import Link from 'next/link'

function ResetPasswordForm() {
  const params = useSearchParams()
  const token = params.get('token') ?? ''
  const router = useRouter()

  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [status, setStatus] = useState<'idle' | 'loading' | 'done' | 'error'>('idle')
  const [error, setError] = useState('')

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (password !== confirm) {
      setError('Passwords do not match.')
      return
    }
    if (password.length < 8) {
      setError('Password must be at least 8 characters.')
      return
    }
    setStatus('loading')
    setError('')

    try {
      const res = await fetch('/api/auth/reset-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token, password }),
      })
      const data = await res.json()
      if (!res.ok) {
        setError(data.error ?? 'Something went wrong.')
        setStatus('error')
      } else {
        setStatus('done')
        setTimeout(() => router.push('/login?reset=1'), 2000)
      }
    } catch {
      setError('Network error. Please try again.')
      setStatus('error')
    }
  }

  if (!token) {
    return (
      <p className="text-sm text-red-600">
        Invalid reset link. Please request a new one from the{' '}
        <Link href="/forgot-password" className="text-amber-700 hover:underline">forgot password</Link> page.
      </p>
    )
  }

  return (
    <form onSubmit={handleSubmit}
      className="rounded-2xl border border-stone-200 bg-white shadow-sm p-6 space-y-4">
      {status === 'done' && (
        <p className="text-sm text-emerald-700 bg-emerald-50 border border-emerald-200 rounded-lg px-3 py-2">
          Password updated! Redirecting to sign in…
        </p>
      )}
      {error && (
        <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">
          {error}
        </p>
      )}

      <div className="space-y-1">
        <label htmlFor="password"
          className="text-xs font-semibold uppercase tracking-widest text-stone-400">
          New password
        </label>
        <input
          id="password"
          type="password"
          required
          minLength={8}
          value={password}
          onChange={e => setPassword(e.target.value)}
          placeholder="At least 8 characters"
          className="w-full rounded-lg border border-stone-200 bg-stone-50 px-3 py-2
                     text-sm text-stone-800 placeholder:text-stone-400
                     focus:outline-none focus:ring-2 focus:ring-amber-600/30 focus:border-amber-600"
        />
      </div>

      <div className="space-y-1">
        <label htmlFor="confirm"
          className="text-xs font-semibold uppercase tracking-widest text-stone-400">
          Confirm password
        </label>
        <input
          id="confirm"
          type="password"
          required
          value={confirm}
          onChange={e => setConfirm(e.target.value)}
          placeholder="Repeat password"
          className="w-full rounded-lg border border-stone-200 bg-stone-50 px-3 py-2
                     text-sm text-stone-800 placeholder:text-stone-400
                     focus:outline-none focus:ring-2 focus:ring-amber-600/30 focus:border-amber-600"
        />
      </div>

      <button
        type="submit"
        disabled={status === 'loading' || status === 'done'}
        className="w-full rounded-lg bg-amber-700 px-4 py-2 text-sm font-semibold
                   text-white hover:bg-amber-800 disabled:opacity-50 transition-colors">
        {status === 'loading' ? 'Saving…' : 'Set new password'}
      </button>

      <p className="text-center text-sm text-stone-400">
        <Link href="/login" className="text-amber-700 hover:text-amber-800 font-medium">
          Back to sign in
        </Link>
      </p>
    </form>
  )
}

export default function ResetPasswordPage() {
  return (
    <main className="min-h-screen flex items-center justify-center px-4"
      style={{ backgroundColor: '#f8f7f4' }}>
      <div className="w-full max-w-sm">
        <h1 className="text-2xl font-bold tracking-tight text-stone-800 mb-1">
          Reset password
        </h1>
        <p className="text-sm text-stone-500 mb-8">Choose a new password for your account.</p>

        <Suspense fallback={<div className="text-sm text-stone-400">Loading…</div>}>
          <ResetPasswordForm />
        </Suspense>
      </div>
    </main>
  )
}
