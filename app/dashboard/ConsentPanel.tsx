'use client'

import { useEffect, useState } from 'react'

type PublicKeyResponse = {
  kid: string
  jwk: JsonWebKey
  alg: string
}

const CODE_KEY = 'vfg-participant-code'
const RECEIPT_KEY = 'vfg-consent-receipt'
const CHOICE_KEY = 'vfg-consent-choice'

function bytesToBase64(bytes: Uint8Array): string {
  let binary = ''
  for (const byte of bytes) binary += String.fromCharCode(byte)
  return btoa(binary)
}

function randomHex(bytes: number): string {
  const buffer = crypto.getRandomValues(new Uint8Array(bytes))
  return [...buffer].map((value) => value.toString(16).padStart(2, '0')).join('')
}

async function encryptConsent(
  key: PublicKeyResponse,
  payload: object,
): Promise<{ v: 1; alg: string; kid: string; iv: string; ek: string; ct: string }> {
  const publicKey = await crypto.subtle.importKey(
    'jwk',
    key.jwk,
    { name: 'RSA-OAEP', hash: 'SHA-256' },
    false,
    ['encrypt'],
  )
  const aes = await crypto.subtle.generateKey({ name: 'AES-GCM', length: 256 }, true, ['encrypt'])
  const rawAes = new Uint8Array(await crypto.subtle.exportKey('raw', aes))
  const ek = new Uint8Array(await crypto.subtle.encrypt({ name: 'RSA-OAEP' }, publicKey, rawAes))
  const iv = crypto.getRandomValues(new Uint8Array(12))
  const ct = new Uint8Array(
    await crypto.subtle.encrypt(
      { name: 'AES-GCM', iv },
      aes,
      new TextEncoder().encode(JSON.stringify(payload)),
    ),
  )
  return {
    v: 1,
    alg: 'RSA-OAEP-256+A256GCM',
    kid: key.kid,
    iv: bytesToBase64(iv),
    ek: bytesToBase64(ek),
    ct: bytesToBase64(ct),
  }
}

export default function ConsentPanel({ name, email }: { name: string; email: string }) {
  const [open, setOpen] = useState<boolean | null>(null)
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
    let receipt = window.localStorage.getItem(RECEIPT_KEY)
    if (!receipt) {
      receipt = randomHex(32)
      window.localStorage.setItem(RECEIPT_KEY, receipt)
    }
    let cancelled = false
    fetch(`/api/consent?receipt=${receipt}`)
      .then((res) => res.json())
      .then((data: { open?: boolean }) => {
        if (!cancelled) setOpen(data.open === true)
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
    const keyResponse = await fetch('/api/consent/key')
    if (!keyResponse.ok) {
      setSaving(false)
      setOpen(false)
      setError('Consent collection is closed until the consent holder’s public key is configured.')
      return
    }
    const key = (await keyResponse.json()) as PublicKeyResponse
    const receipt = window.localStorage.getItem(RECEIPT_KEY) ?? randomHex(32)
    window.localStorage.setItem(RECEIPT_KEY, receipt)
    const envelope = await encryptConsent(key, {
      decision,
      participantCode: code.trim(),
      name,
      email,
      at: Math.floor(Date.now() / 1000),
    })
    const res = await fetch('/api/consent', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ envelope, receipt }),
    })
    const data = await res.json().catch(() => ({}))
    setSaving(false)
    if (!res.ok) {
      setError(typeof data.error === 'string' ? data.error : 'Could not save consent.')
      return
    }
    window.sessionStorage.setItem(CODE_KEY, code.trim())
    window.localStorage.setItem(CHOICE_KEY, decision)
    setSavedChoice(decision)
  }

  return (
    <section className="mb-8 rounded-2xl border border-stone-200 bg-white p-6 shadow-sm">
      <h2 className="text-xs font-semibold uppercase tracking-widest text-stone-400">Research consent</h2>
      <p className="mt-2 text-sm leading-relaxed text-stone-600">
        You can allow or decline use of your survey answers in a research study. Either choice has no effect on your course grade.
        The choice is encrypted in your browser to the consent holder’s public key. The server stores only that ciphertext.
        Your instructor cannot read it, and neither can anyone looking at the database. The private key stays on the consent holder’s own computer.
      </p>
      {open === null ? (
        <p className="mt-3 text-sm text-stone-400">Loading consent…</p>
      ) : open === false ? (
        <p className="mt-3 text-sm text-stone-600">
          Consent collection is closed. It stays closed until a consent public key is configured, and it closes again after grades are marked posted.
        </p>
      ) : (
        <form onSubmit={handleSubmit} className="mt-4 space-y-3">
          {savedChoice && (
            <p className="text-sm text-stone-700">
              Saved on this browser: <span className="font-medium">{savedChoice === 'grant' ? 'granted' : 'declined'}</span>.
              You can replace it until grades are posted. The server does not show the choice back.
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
            {saving ? 'Encrypting…' : 'Save consent'}
          </button>
          {error && <p className="text-sm text-red-600">{error}</p>}
        </form>
      )}
    </section>
  )
}
