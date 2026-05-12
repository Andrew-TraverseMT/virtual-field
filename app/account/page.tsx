'use client'

import { useState } from 'react'
import { useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'

export default function AccountPage() {
  const { data: session, status } = useSession()
  const router = useRouter()

  const [current, setCurrent] = useState('')
  const [next, setNext] = useState('')
  const [confirm, setConfirm] = useState('')
  const [saving, setSaving] = useState(false)
  const [msg, setMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null)

  if (status === 'loading') {
    return (
      <main className="min-h-screen flex items-center justify-center" style={{ backgroundColor: '#f8f7f4' }}>
        <p className="text-sm text-stone-400">Loading…</p>
      </main>
    )
  }
  if (!session) {
    router.replace('/login')
    return null
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (next !== confirm) {
      setMsg({ type: 'error', text: 'New passwords do not match.' })
      return
    }
    if (next.length < 8) {
      setMsg({ type: 'error', text: 'New password must be at least 8 characters.' })
      return
    }
    setSaving(true)
    setMsg(null)

    try {
      const res = await fetch('/api/account/password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ currentPassword: current, newPassword: next }),
      })
      const data = await res.json()
      if (!res.ok) {
        setMsg({ type: 'error', text: data.error ?? 'Something went wrong.' })
      } else {
        setMsg({ type: 'success', text: 'Password updated successfully.' })
        setCurrent('')
        setNext('')
        setConfirm('')
      }
    } catch {
      setMsg({ type: 'error', text: 'Network error. Please try again.' })
    } finally {
      setSaving(false)
    }
  }

  return (
    <main className="min-h-screen px-4 py-12" style={{ backgroundColor: '#f8f7f4' }}>
      <div className="mx-auto max-w-md">
        <div className="mb-6">
          <Link href="/dashboard"
            className="text-xs font-semibold uppercase tracking-widest text-stone-400 hover:text-amber-700">
            ← Dashboard
          </Link>
        </div>

        <h1 className="text-2xl font-bold tracking-tight text-stone-800 mb-1">Account</h1>
        <p className="text-sm text-stone-500 mb-8">
          Signed in as <span className="font-medium text-stone-700">{session.user?.email}</span>
        </p>

        <div className="rounded-2xl border border-stone-200 bg-white shadow-sm p-6">
          <h2 className="text-xs font-semibold uppercase tracking-widest text-stone-400 mb-5">
            Change Password
          </h2>

          <form onSubmit={handleSubmit} className="space-y-4">
            {msg && (
              <p className={`text-sm rounded-lg px-3 py-2 border ${
                msg.type === 'success'
                  ? 'text-emerald-700 bg-emerald-50 border-emerald-200'
                  : 'text-red-600 bg-red-50 border-red-200'
              }`}>
                {msg.text}
              </p>
            )}

            {[
              { id: 'current', label: 'Current password', value: current, setter: setCurrent },
              { id: 'next', label: 'New password', value: next, setter: setNext },
              { id: 'confirm', label: 'Confirm new password', value: confirm, setter: setConfirm },
            ].map(({ id, label, value, setter }) => (
              <div key={id} className="space-y-1">
                <label htmlFor={id}
                  className="text-xs font-semibold uppercase tracking-widest text-stone-400">
                  {label}
                </label>
                <input
                  id={id}
                  type="password"
                  required
                  value={value}
                  onChange={e => setter(e.target.value)}
                  className="w-full rounded-lg border border-stone-200 bg-stone-50 px-3 py-2
                             text-sm text-stone-800 placeholder:text-stone-400
                             focus:outline-none focus:ring-2 focus:ring-amber-600/30 focus:border-amber-600"
                />
              </div>
            ))}

            <button
              type="submit"
              disabled={saving}
              className="w-full rounded-lg bg-amber-700 px-4 py-2 text-sm font-semibold
                         text-white hover:bg-amber-800 disabled:opacity-50 transition-colors">
              {saving ? 'Saving…' : 'Update password'}
            </button>
          </form>
        </div>
      </div>
    </main>
  )
}
