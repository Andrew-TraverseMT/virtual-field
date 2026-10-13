'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'

export default function ConsentTools({ canExport }: { canExport: boolean }) {
  const router = useRouter()
  const [error, setError] = useState('')
  const [purgeArmed, setPurgeArmed] = useState(false)
  const [working, setWorking] = useState(false)

  async function handleExport() {
    setWorking(true)
    setError('')
    const res = await fetch('/api/consent/export')
    if (!res.ok) {
      const data = await res.json().catch(() => ({}))
      setWorking(false)
      setError(typeof data.error === 'string' ? data.error : 'Export is not available.')
      return
    }
    const blob = await res.blob()
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = 'consent-export.json'
    link.click()
    URL.revokeObjectURL(url)
    setWorking(false)
  }

  async function handlePurge() {
    setWorking(true)
    setError('')
    const res = await fetch('/api/consent/purge', { method: 'POST' })
    const data = await res.json().catch(() => ({}))
    setWorking(false)
    if (!res.ok) {
      setError(typeof data.error === 'string' ? data.error : 'Could not purge consent records.')
      return
    }
    setPurgeArmed(false)
    router.refresh()
  }

  return (
    <div className="mb-8 rounded-2xl border border-stone-200 bg-white p-6 shadow-sm">
      <h2 className="text-xs font-semibold uppercase tracking-widest text-stone-400">Export and purge</h2>
      <p className="mt-2 text-sm leading-relaxed text-stone-600">
        Export downloads ciphertext. Decrypt it on your computer with the private key:
      </p>
      <pre className="mt-3 overflow-x-auto rounded-lg bg-stone-50 p-3 text-xs text-stone-700">
        node --experimental-strip-types scripts/decrypt-consent.ts --bundle consent-export.json --private-key /path/to/private.pem
      </pre>
      <p className="mt-3 text-sm leading-relaxed text-stone-600">
        The private key is not on this server. Purge deletes the stored ciphertext and writes an audit row with the count. It does not show the records.
      </p>
      <div className="mt-4 flex flex-wrap gap-3">
        <button
          type="button"
          disabled={!canExport || working}
          onClick={handleExport}
          className="rounded-lg bg-stone-900 px-4 py-2 text-sm font-semibold text-white hover:bg-stone-700 disabled:opacity-60"
        >
          Download ciphertext
        </button>
        {!purgeArmed ? (
          <button
            type="button"
            disabled={working}
            onClick={() => setPurgeArmed(true)}
            className="rounded-lg border border-stone-300 px-4 py-2 text-sm font-semibold text-stone-700 hover:bg-stone-50 disabled:opacity-60"
          >
            Purge consent records
          </button>
        ) : (
          <button
            type="button"
            disabled={working}
            onClick={handlePurge}
            className="rounded-lg bg-red-700 px-4 py-2 text-sm font-semibold text-white hover:bg-red-800 disabled:opacity-60"
          >
            {working ? 'Purging…' : 'Confirm purge'}
          </button>
        )}
      </div>
      {error && <p className="mt-3 text-sm text-red-600">{error}</p>}
    </div>
  )
}
