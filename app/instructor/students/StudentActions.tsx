'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'

// ── Add Student Form ──────────────────────────────────────────────────────────

export function AddStudentForm() {
  const router = useRouter()
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [status, setStatus] = useState<'idle' | 'loading' | 'done' | 'error'>('idle')
  const [error, setError] = useState('')

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setStatus('loading')
    setError('')

    const res = await fetch('/api/auth/create-student', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: name.trim(), email: email.trim() }),
    })

    if (!res.ok) {
      const data = await res.json().catch(() => ({}))
      setError(data.error ?? 'Something went wrong.')
      setStatus('error')
      return
    }

    setName('')
    setEmail('')
    setStatus('done')
    router.refresh()
    setTimeout(() => setStatus('idle'), 3000)
  }

  return (
    <div className="rounded-2xl border border-stone-200 bg-white shadow-sm p-6 mb-8">
      <h2 className="text-xs font-semibold uppercase tracking-widest text-stone-400 mb-4">
        Add student
      </h2>
      <form onSubmit={handleSubmit} className="flex flex-col sm:flex-row gap-3">
        <input
          type="text"
          required
          placeholder="Full name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          className="flex-1 rounded-lg border border-stone-200 bg-stone-50 px-3.5 py-2.5 text-sm text-stone-900 placeholder:text-stone-400 outline-none transition focus:border-amber-500 focus:bg-white focus:ring-2 focus:ring-amber-100"
        />
        <input
          type="email"
          required
          placeholder="Email address"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className="flex-1 rounded-lg border border-stone-200 bg-stone-50 px-3.5 py-2.5 text-sm text-stone-900 placeholder:text-stone-400 outline-none transition focus:border-amber-500 focus:bg-white focus:ring-2 focus:ring-amber-100"
        />
        <button
          type="submit"
          disabled={status === 'loading'}
          className="rounded-lg bg-amber-700 px-5 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-amber-800 disabled:opacity-60 whitespace-nowrap"
        >
          {status === 'loading' ? 'Creating…' : 'Create account'}
        </button>
      </form>
      {status === 'done' && (
        <p className="mt-3 text-sm text-emerald-600">
          Account created — credentials emailed to you.
        </p>
      )}
      {status === 'error' && (
        <p className="mt-3 text-sm text-red-600">{error}</p>
      )}
    </div>
  )
}

// ── Reset Password Button ─────────────────────────────────────────────────────

export function ResetPasswordButton({ studentId, studentName }: { studentId: string; studentName: string }) {
  const [status, setStatus] = useState<'idle' | 'loading' | 'done' | 'error'>('idle')

  async function handleReset() {
    if (!confirm(`Reset password for ${studentName}? A new temporary password will be emailed to you.`)) return
    setStatus('loading')

    const res = await fetch('/api/auth/reset-student-password', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ studentId }),
    })

    setStatus(res.ok ? 'done' : 'error')
    if (res.ok) setTimeout(() => setStatus('idle'), 4000)
  }

  if (status === 'done') return <span className="text-xs text-emerald-600 font-medium">Sent ✓</span>
  if (status === 'error') return <span className="text-xs text-red-500 font-medium">Failed</span>

  return (
    <button
      onClick={handleReset}
      disabled={status === 'loading'}
      className="text-xs text-stone-400 hover:text-amber-700 font-medium transition disabled:opacity-50"
    >
      {status === 'loading' ? 'Resetting…' : 'Reset password'}
    </button>
  )
}
