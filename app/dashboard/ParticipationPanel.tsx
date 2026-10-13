'use client'

import { useEffect, useState } from 'react'

export default function ParticipationPanel() {
  const [credited, setCredited] = useState(false)
  const [response, setResponse] = useState('')
  const [error, setError] = useState('')
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)

  useEffect(() => {
    let cancelled = false
    fetch('/api/participation')
      .then((res) => res.json())
      .then((data: { credited?: boolean; alternative?: string | null }) => {
        if (cancelled) return
        setCredited(data.credited === true)
        if (typeof data.alternative === 'string') {
          setResponse(data.alternative)
          setSaved(true)
        }
      })
      .catch(() => {})
    return () => {
      cancelled = true
    }
  }, [])

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault()
    setSaving(true)
    setError('')
    const res = await fetch('/api/participation', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ response }),
    })
    const data = await res.json().catch(() => ({}))
    setSaving(false)
    if (!res.ok) {
      setError(typeof data.error === 'string' ? data.error : 'Could not save the reflection.')
      return
    }
    setCredited(true)
    setSaved(true)
  }

  return (
    <section className="mb-8 rounded-2xl border border-stone-200 bg-white p-6 shadow-sm">
      <h2 className="text-xs font-semibold uppercase tracking-widest text-stone-400">Optional participation</h2>
      <p className="mt-2 text-sm leading-relaxed text-stone-600">
        If participation credit is offered, you can earn it in either of two ways. Complete the exercise surveys, or write the course reflection below.
        Both are recorded as the same credit. Your instructor sees only whether credit was recorded. They do not see which option you used, and they do not see your research consent.
        The credit amount is not applied to your point total until it is confirmed.
      </p>
      {credited && (
        <p className="mt-3 text-sm text-stone-700">Participation credit is recorded for your account.</p>
      )}
      <form onSubmit={handleSubmit} className="mt-4 space-y-3">
        <label className="block text-sm text-stone-700">
          Course reflection
          <textarea
            value={response}
            onChange={(event) => setResponse(event.target.value)}
            required
            minLength={40}
            maxLength={4000}
            rows={5}
            placeholder="What did you learn in this virtual field course, and what would you do differently in the field?"
            className="mt-1 w-full rounded-lg border border-stone-200 bg-stone-50 px-3 py-2 text-sm outline-none focus:border-amber-500 focus:bg-white"
          />
        </label>
        <button
          type="submit"
          disabled={saving}
          className="rounded-lg bg-stone-900 px-4 py-2 text-sm font-semibold text-white hover:bg-stone-700 disabled:opacity-60"
        >
          {saving ? 'Saving…' : saved ? 'Update reflection' : 'Submit reflection'}
        </button>
        {error && <p className="text-sm text-red-600">{error}</p>}
      </form>
    </section>
  )
}
