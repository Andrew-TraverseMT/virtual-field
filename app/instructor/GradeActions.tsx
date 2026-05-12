'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'

type Action = 'approve' | 'modify' | 'request_revision'

export default function GradeActions({
  submissionId,
  currentStatus,
  currentGrade,
  totalPoints,
}: {
  submissionId: string
  currentStatus: string
  currentGrade: number | null
  totalPoints: number
}) {
  const router = useRouter()
  const [action, setAction] = useState<Action | null>(null)
  const [grade, setGrade] = useState(currentGrade?.toString() ?? '')
  const [notes, setNotes] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  async function submit(a: Action) {
    setError('')
    setLoading(true)

    const body: { action: Action; grade?: number; notes?: string } = { action: a }
    if (a !== 'request_revision' && grade) body.grade = parseInt(grade, 10)
    if (notes.trim()) body.notes = notes.trim()

    const res = await fetch(`/api/grades/${submissionId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    })

    setLoading(false)

    if (!res.ok) {
      const data = await res.json().catch(() => ({}))
      setError(data.error ?? 'Action failed.')
      return
    }

    setAction(null)
    router.refresh()
  }

  return (
    <div className="mt-3 space-y-2">
      {!action && (
        <div className="flex flex-col gap-2">
          <button
            onClick={() => setAction('approve')}
            disabled={currentStatus === 'approved'}
            className="w-full rounded-xl bg-emerald-50 px-3 py-2 text-xs font-semibold text-emerald-700 ring-1 ring-emerald-200 hover:bg-emerald-100 transition-colors disabled:opacity-40"
          >
            Approve
          </button>
          <button
            onClick={() => setAction('modify')}
            className="w-full rounded-xl bg-stone-50 px-3 py-2 text-xs font-semibold text-stone-700 ring-1 ring-stone-200 hover:bg-stone-100 transition-colors"
          >
            Modify Grade
          </button>
          <button
            onClick={() => setAction('request_revision')}
            disabled={currentStatus === 'revision_requested'}
            className="w-full rounded-xl bg-orange-50 px-3 py-2 text-xs font-semibold text-orange-700 ring-1 ring-orange-200 hover:bg-orange-100 transition-colors disabled:opacity-40"
          >
            Request Revision
          </button>
        </div>
      )}

      {action && (
        <div className="rounded-xl border border-stone-200 bg-stone-50 p-4 space-y-3">
          <p className="text-xs font-semibold uppercase tracking-widest text-stone-400">
            {action === 'approve' && 'Approve submission'}
            {action === 'modify' && 'Modify grade'}
            {action === 'request_revision' && 'Request revision'}
          </p>

          {action !== 'request_revision' && (
            <div>
              <label className="mb-1.5 block text-xs font-medium text-stone-500">
                Grade (out of {totalPoints})
              </label>
              <input
                type="number"
                min={0}
                max={totalPoints}
                value={grade}
                onChange={(e) => setGrade(e.target.value)}
                className="w-24 rounded-lg border border-stone-200 bg-white px-2.5 py-1.5 text-sm focus:border-amber-500 focus:outline-none focus:ring-2 focus:ring-amber-100"
              />
            </div>
          )}

          <div>
            <label className="mb-1.5 block text-xs font-medium text-stone-500">
              Notes to student{action !== 'request_revision' && ' (optional)'}
            </label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={2}
              className="w-full rounded-lg border border-stone-200 bg-white px-2.5 py-2 text-sm focus:border-amber-500 focus:outline-none focus:ring-2 focus:ring-amber-100 resize-none"
              placeholder={action === 'request_revision' ? 'Explain what needs to be revised…' : 'Any additional feedback…'}
              required={action === 'request_revision'}
            />
          </div>

          {error && <p className="text-xs text-red-500">{error}</p>}

          <div className="flex gap-2">
            <button
              onClick={() => submit(action)}
              disabled={loading || (action === 'request_revision' && !notes.trim())}
              className="rounded-lg bg-stone-900 px-3 py-1.5 text-xs font-semibold text-white hover:bg-stone-800 disabled:opacity-50 transition-colors"
            >
              {loading ? 'Saving…' : 'Confirm'}
            </button>
            <button
              onClick={() => { setAction(null); setError('') }}
              className="rounded-lg border border-stone-200 px-3 py-1.5 text-xs font-medium text-stone-500 hover:bg-white transition-colors"
            >
              Cancel
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
