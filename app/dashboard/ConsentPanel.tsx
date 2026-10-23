'use client'

import { useEffect, useState } from 'react'

const CODE_KEY = 'vfg-participant-code'
const CHOICE_KEY = 'vfg-consent-choice'

export default function ConsentPanel() {
  const [open, setOpen] = useState<boolean | null>(null)
  const [submitted, setSubmitted] = useState(false)
  const [decision, setDecision] = useState<'grant' | 'decline'>('grant')
  const [code, setCode] = useState('')
  const [savedChoice, setSavedChoice] = useState<'grant' | 'decline' | null>(null)
  const [error, setError] = useState('')
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    const storedCode = window.sessionStorage.getItem(CODE_KEY) ?? ''
    const storedChoice = window.localStorage.getItem(CHOICE_KEY)
    setCode(storedCode)
    if (storedChoice === 'grant' || storedChoice === 'decline') setSavedChoice(storedChoice)
    let cancelled = false
    fetch('/api/consent')
      .then((res) => res.json())
      .then((data: { open?: boolean; submitted?: boolean }) => {
        if (cancelled) return
        setOpen(data.open === true)
        setSubmitted(data.submitted === true)
      })
      .catch(() => {
        if (!cancelled) setOpen(false)
      })
    return () => {
      cancelled = true
    }
  }, [])

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault()
    setSaving(true)
    setError('')
    const res = await fetch('/api/consent', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ decision, participantCode: code.trim() }),
    })
    const data = await res.json().catch(() => ({}))
    setSaving(false)
    if (!res.ok) {
      if (res.status === 503) setOpen(false)
      setError(typeof data.error === 'string' ? data.error : 'Could not save consent.')
      return
    }
    window.sessionStorage.setItem(CODE_KEY, code.trim())
    window.localStorage.setItem(CHOICE_KEY, decision)
    setSavedChoice(decision)
    setSubmitted(true)
  }

  return (
    <section className="mb-8 rounded-2xl border border-stone-200 bg-white p-6 shadow-sm">
      <h2 className="text-xs font-semibold uppercase tracking-widest text-stone-400">Research consent</h2>
      <p className="mt-2 text-sm leading-relaxed text-stone-600">
        You can allow or decline use of your survey answers in a research study. Either choice has no effect on your course grade.
        The server encrypts the choice before it is stored. Your instructor cannot read it.
      </p>
      {open === null ? (
        <p className="mt-3 text-sm text-stone-400">Loading consent…</p>
      ) : open === false ? (
        <p className="mt-3 text-sm text-stone-600">
          Consent collection is closed. It stays closed until CONSENT_ENCRYPTION_KEY is configured, and it closes again after grades are marked posted.
        </p>
      ) : (
        <form onSubmit={handleSubmit} className="mt-4 space-y-3">
          {submitted && (
            <p className="text-sm text-stone-700">
              A consent choice is already stored for this account. You can replace it until grades are posted.
            </p>
          )}
          {savedChoice && (
            <p className="text-sm text-stone-500">
              Saved on this browser: <span className="font-medium">{savedChoice === 'grant' ? 'granted' : 'declined'}</span>.
            </p>
          )}
          <div className="flex flex-wrap gap-4 text-sm text-stone-700">
            <label className="flex items-center gap-2">
              <input type="radio" name="decision" checked={decision === 'grant'} onChange={() => setDecision('grant')} />
              Allow research use
            </label>
            <label className="flex items-center gap-2">
              <input type="radio" name="decision" checked={decision === 'decline'} onChange={() => setDecision('decline')} />
              Decline research use
            </label>
          </div>
          <label className="block text-sm text-stone-700">
            Linking code
            <input
              value={code}
              onChange={(event) => setCode(event.target.value)}
              required
              minLength={8}
              maxLength={40}
              autoComplete="off"
              spellCheck={false}
              placeholder="8–40 letters, numbers, or hyphens"
              className="mt-1 w-full rounded-lg border border-stone-200 bg-stone-50 px-3 py-2 text-sm outline-none focus:border-amber-500 focus:bg-white"
            />
          </label>
          <p className="text-xs leading-relaxed text-stone-400">
            Use a code you can remember. Do not use your name, email, or account id. Survey answers are stored under this code only.
          </p>
          <button
            type="submit"
            disabled={saving}
            className="rounded-lg bg-stone-900 px-4 py-2 text-sm font-semibold text-white hover:bg-stone-700 disabled:opacity-60"
          >
            {saving ? 'Saving…' : 'Save consent'}
          </button>
          {error && <p className="text-sm text-red-600">{error}</p>}
        </form>
      )}
    </section>
  )
}
