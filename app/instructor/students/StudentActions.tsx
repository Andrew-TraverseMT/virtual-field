'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'

// ── Add Student Form ──────────────────────────────────────────────────────────

function todayIso() {
  return new Date().toISOString().slice(0, 10)
}

export function AddStudentForm() {
  const router = useRouter()
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [startDate, setStartDate] = useState(todayIso())
  const [status, setStatus] = useState<'idle' | 'loading' | 'done' | 'error'>('idle')
  const [error, setError] = useState('')
  const [createdPassword, setCreatedPassword] = useState('')
  const [copied, setCopied] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setStatus('loading')
    setError('')
    setCreatedPassword('')

    const res = await fetch('/api/auth/create-student', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: name.trim(), email: email.trim(), startDate }),
    })

    const data = await res.json().catch(() => ({}))

    if (!res.ok) {
      setError(data.error ?? 'Something went wrong.')
      setStatus('error')
      return
    }

    setName('')
    setEmail('')
    setStartDate(todayIso())
    setCreatedPassword(data.tempPassword ?? '')
    setStatus('done')
    router.refresh()
  }

  async function copyPassword() {
    await navigator.clipboard.writeText(createdPassword)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
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
        <div className="flex flex-col gap-1">
          <label className="text-[11px] font-medium text-stone-400 pl-0.5">Course start date</label>
          <input
            type="date"
            required
            value={startDate}
            onChange={(e) => setStartDate(e.target.value)}
            className="rounded-lg border border-stone-200 bg-stone-50 px-3.5 py-2.5 text-sm text-stone-900 outline-none transition focus:border-amber-500 focus:bg-white focus:ring-2 focus:ring-amber-100"
          />
        </div>
        <button
          type="submit"
          disabled={status === 'loading'}
          className="self-end rounded-lg bg-amber-700 px-5 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-amber-800 disabled:opacity-60 whitespace-nowrap"
        >
          {status === 'loading' ? 'Creating…' : 'Create account'}
        </button>
      </form>

      {status === 'done' && createdPassword && (
        <div className="mt-4 flex items-center gap-3 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3">
          <div className="flex-1 min-w-0">
            <div className="text-[11px] font-semibold uppercase tracking-widest text-emerald-600 mb-0.5">Temporary password</div>
            <div className="font-mono text-base font-bold text-emerald-900 tracking-wide">{createdPassword}</div>
          </div>
          <button
            onClick={copyPassword}
            className="flex-none rounded-lg border border-emerald-200 bg-white px-3 py-1.5 text-xs font-semibold text-emerald-700 hover:bg-emerald-100 transition"
          >
            {copied ? 'Copied!' : 'Copy'}
          </button>
        </div>
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
