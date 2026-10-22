'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'

export default function GradesReleaseButton({ gradesPosted }: { gradesPosted: boolean }) {
  const router = useRouter()
  const [confirm, setConfirm] = useState(false)
  const [error, setError] = useState('')
  const [saving, setSaving] = useState(false)

  async function handleRelease() {
    setSaving(true)
    setError('')
    const res = await fetch('/api/study/release', { method: 'POST' })
    const data = await res.json().catch(() => ({}))
    setSaving(false)
    if (!res.ok) {
      setError(typeof data.error === 'string' ? data.error : 'Could not mark grades posted.')
      return
    }
    router.refresh()
  }

  if (gradesPosted) {
    return (
      <p className="rounded-xl border border-stone-200 bg-stone-50 px-4 py-3 text-sm text-stone-600">
        Grades are marked posted. The researcher can no longer view or export consent. Survey responses stay stored until the researcher purges them. This did not decrypt those records.
      </p>
    )
  }

  return (
    <div className="rounded-2xl border border-stone-200 bg-white p-6 shadow-sm">
      <h2 className="text-xs font-semibold uppercase tracking-widest text-stone-400">Grades posted</h2>
      <p className="mt-2 text-sm leading-relaxed text-stone-600">
        Only an instructor can mark grades posted. The researcher cannot. This app does not detect when official course grades are posted.
        Marking it is one-way. It closes the researcher’s consent view and export. It does not decrypt consent records and it does not delete survey responses.
      </p>
      <label className="mt-4 flex items-start gap-2 text-sm text-stone-700">
        <input type="checkbox" checked={confirm} onChange={(event) => setConfirm(event.target.checked)} className="mt-1" />
        <span>I understand this closes consent view and export. It does not delete the encrypted records.</span>
      </label>
      <button
        type="button"
        disabled={!confirm || saving}
        onClick={handleRelease}
        className="mt-4 rounded-lg bg-stone-900 px-4 py-2 text-sm font-semibold text-white hover:bg-stone-700 disabled:opacity-60"
      >
        {saving ? 'Saving…' : 'Mark grades posted'}
      </button>
      {error && <p className="mt-3 text-sm text-red-600">{error}</p>}
    </div>
  )
}
