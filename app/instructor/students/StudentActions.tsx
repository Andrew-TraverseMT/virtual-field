'use client'

import { useRef, useState } from 'react'
import { useRouter } from 'next/navigation'

// ── Add Student Form ──────────────────────────────────────────────────────────

function todayIso() {
  const d = new Date()
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
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

// ── Password Cell ─────────────────────────────────────────────────────────────

export function PasswordCell({ studentId, initialPassword }: { studentId: string; initialPassword: string | null }) {
  const [password, setPassword] = useState(initialPassword ?? '')
  const [visible, setVisible] = useState(false)
  const [resetting, setResetting] = useState(false)
  const [copied, setCopied] = useState(false)

  async function handleReset() {
    setResetting(true)
    const res = await fetch('/api/auth/reset-student-password', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ studentId }),
    })
    if (res.ok) {
      const data = await res.json()
      setPassword(data.tempPassword ?? '')
      setVisible(true)
    }
    setResetting(false)
  }

  async function handleCopy() {
    if (!password) return
    await navigator.clipboard.writeText(password)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <div className="flex items-center gap-1.5">
      <span className="font-mono text-xs text-stone-700 min-w-[80px]">
        {password ? (visible ? password : '••••••••••') : <span className="text-stone-300 italic">none</span>}
      </span>
      {password && (
        <>
          <button
            onClick={() => setVisible((v) => !v)}
            title={visible ? 'Hide' : 'Show'}
            className="text-stone-300 hover:text-stone-500 transition"
          >
            {visible ? (
              <svg width="14" height="14" viewBox="0 0 20 20" fill="currentColor">
                <path d="M10 3C5 3 1.73 7.11 1 10c.73 2.89 4 7 9 7s8.27-4.11 9-7c-.73-2.89-4-7-9-7zm0 12a5 5 0 110-10 5 5 0 010 10zm0-8a3 3 0 100 6 3 3 0 000-6z"/>
              </svg>
            ) : (
              <svg width="14" height="14" viewBox="0 0 20 20" fill="currentColor">
                <path d="M2.93 3.93a1 1 0 011.41 0l11.73 11.73a1 1 0 01-1.41 1.41L13 15.41A9.26 9.26 0 0110 16c-5 0-8.27-4.11-9-7a9.26 9.26 0 012.55-4.14L2.93 5.34a1 1 0 010-1.41zM10 6a4 4 0 013.87 5l-5.23-5.23A4 4 0 0110 6zm0 8a4 4 0 01-3.87-3L10 14.87A4 4 0 0110 14z"/>
              </svg>
            )}
          </button>
          <button
            onClick={handleCopy}
            title="Copy password"
            className="text-stone-300 hover:text-stone-500 transition text-[10px] font-semibold"
          >
            {copied ? '✓' : (
              <svg width="13" height="13" viewBox="0 0 20 20" fill="currentColor">
                <path d="M8 2a2 2 0 00-2 2H5a2 2 0 00-2 2v10a2 2 0 002 2h8a2 2 0 002-2v-1a2 2 0 002-2V6l-4-4H8zm0 2h4v3h3v1H8V4zm-3 4h2v8H5V8zm4 0h6v8H9V8z"/>
              </svg>
            )}
          </button>
        </>
      )}
      <button
        onClick={handleReset}
        disabled={resetting}
        title="Reset password"
        className="text-stone-300 hover:text-amber-600 transition disabled:opacity-40 text-[10px] font-semibold"
      >
        {resetting ? '…' : (
          <svg width="13" height="13" viewBox="0 0 20 20" fill="currentColor">
            <path d="M4 10a6 6 0 016-6 6 6 0 014.47 2H13a1 1 0 100 2h4a1 1 0 001-1V3a1 1 0 10-2 0v1.28A8 8 0 002 10a1 1 0 102 0zm12 0a1 1 0 10-2 0 6 6 0 01-6 6 6 6 0 01-4.47-2H5a1 1 0 100-2H1a1 1 0 00-1 1v4a1 1 0 102 0v-1.28A8 8 0 0018 10z"/>
          </svg>
        )}
      </button>
    </div>
  )
}

// ── Delete Student Button ─────────────────────────────────────────────────────

export function DeleteStudentButton({ studentId, studentName }: { studentId: string; studentName: string }) {
  const router = useRouter()
  const dialogRef = useRef<HTMLDialogElement>(null)
  const [typed, setTyped] = useState('')
  const [deleting, setDeleting] = useState(false)
  const [error, setError] = useState('')
  const [gradedWarning, setGradedWarning] = useState<{ count: number } | null>(null)

  async function handleDelete(force = false) {
    if (typed !== studentName) return
    setDeleting(true)
    setError('')
    const res = await fetch('/api/auth/delete-student', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ studentId, force }),
    })
    if (res.ok) {
      dialogRef.current?.close()
      router.refresh()
    } else {
      const data = await res.json().catch(() => ({}))
      if (res.status === 409 && data.gradedCount) {
        setGradedWarning({ count: data.gradedCount })
      } else {
        setError(data.error ?? 'Failed to delete.')
      }
      setDeleting(false)
    }
  }

  function close() {
    dialogRef.current?.close()
    setTyped('')
    setError('')
    setGradedWarning(null)
  }

  return (
    <>
      <button
        onClick={() => dialogRef.current?.showModal()}
        className="text-stone-300 hover:text-red-500 transition"
        title="Delete student"
      >
        <svg width="14" height="14" viewBox="0 0 20 20" fill="currentColor">
          <path fillRule="evenodd" d="M9 2a1 1 0 00-.894.553L7.382 4H4a1 1 0 000 2v10a2 2 0 002 2h8a2 2 0 002-2V6a1 1 0 100-2h-3.382l-.724-1.447A1 1 0 0011 2H9zM7 8a1 1 0 012 0v6a1 1 0 11-2 0V8zm4 0a1 1 0 112 0v6a1 1 0 11-2 0V8z" clipRule="evenodd"/>
        </svg>
      </button>
      <dialog
        ref={dialogRef}
        onClick={(e) => { if (e.target === dialogRef.current) close() }}
        className="rounded-2xl border border-stone-200 bg-white p-6 shadow-xl backdrop:bg-black/30 w-80 max-w-[90vw]"
      >
        <h2 className="text-sm font-semibold text-stone-800 mb-1">Delete student?</h2>
        <p className="text-xs text-stone-500 mb-4">
          This will permanently remove <span className="font-medium text-stone-700">{studentName}</span> and all their submissions. Type their name to confirm.
        </p>
        <input
          autoFocus
          type="text"
          placeholder={`Type "${studentName}" to confirm`}
          value={typed}
          onChange={(e) => setTyped(e.target.value)}
          onKeyDown={(e) => { if (e.key === 'Enter' && !gradedWarning) handleDelete(); if (e.key === 'Escape') close() }}
          className="w-full rounded-lg border border-stone-200 px-3 py-2 text-sm text-stone-800 outline-none focus:border-red-400 focus:ring-1 focus:ring-red-200 mb-3"
        />
        {gradedWarning && (
          <div className="mb-3 rounded-xl border border-red-200 bg-red-50 p-3">
            <p className="text-xs font-semibold text-red-700 mb-1">
              Warning: {gradedWarning.count} graded submission{gradedWarning.count !== 1 ? 's' : ''} will be permanently lost.
            </p>
            <p className="text-xs text-red-600">This cannot be undone. Click &ldquo;Force delete&rdquo; to proceed anyway.</p>
          </div>
        )}
        {error && <p className="text-xs text-red-500 mb-3">{error}</p>}
        <div className="flex gap-2 justify-end">
          <button
            onClick={close}
            className="rounded-lg border border-stone-200 px-3 py-1.5 text-xs font-medium text-stone-600 hover:bg-stone-50 transition"
          >
            Cancel
          </button>
          {gradedWarning ? (
            <button
              onClick={() => handleDelete(true)}
              disabled={typed !== studentName || deleting}
              className="rounded-lg bg-red-700 px-3 py-1.5 text-xs font-semibold text-white hover:bg-red-800 disabled:opacity-40 transition"
            >
              {deleting ? 'Deleting...' : 'Force delete'}
            </button>
          ) : (
            <button
              onClick={() => handleDelete(false)}
              disabled={typed !== studentName || deleting}
              className="rounded-lg bg-red-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-red-700 disabled:opacity-40 transition"
            >
              {deleting ? 'Deleting...' : 'Delete'}
            </button>
          )}
        </div>
      </dialog>
    </>
  )
}
