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
    <div className="mt-3 space-y-3">
      {!action && (
        <div className="flex flex-wrap gap-2">
          <button
            onClick={() => setAction('approve')}
            disabled={currentStatus === 'approved'}
            className="rounded-lg bg-emerald-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-emerald-700 disabled:opacity-40"
          >
            ✓ Approve
          </button>
          <button
            onClick={() => setAction('modify')}
            className="rounded-lg bg-violet-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-violet-700"
          >
            ✏️ Modify Grade
          </button>
          <button
            onClick={() => setAction('request_revision')}
            disabled={currentStatus === 'revision_requested'}
            className="rounded-lg bg-orange-500 px-3 py-1.5 text-xs font-semibold text-white hover:bg-orange-600 disabled:opacity-40"
          >
            ↩ Request Revision
          </button>
        </div>
      )}

      {action && (
        <div className="rounded-lg border border-stone-200 bg-stone-50 p-3">
          <div className="mb-2 text-sm font-medium text-stone-700">
            {action === 'approve' && 'Approve submission'}
            {action === 'modify' && 'Modify grade'}
            {action === 'request_revision' && 'Request revision'}
          </div>

          {action !== 'request_revision' && (
            <div className="mb-2">
              <label className="mb-1 block text-xs font-medium text-stone-600">
                Grade (out of {totalPoints})
              </label>
              <input
                type="number"
                min={0}
                max={totalPoints}
                value={grade}
                onChange={(e) => setGrade(e.target.value)}
                className="w-24 rounded-md border border-stone-300 px-2 py-1 text-sm focus:border-amber-400 focus:outline-none"
              />
            </div>
          )}

          <div className="mb-3">
            <label className="mb-1 block text-xs font-medium text-stone-600">
              Notes to student {action !== 'request_revision' && '(optional)'}
            </label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={2}
              className="w-full rounded-md border border-stone-300 px-2 py-1 text-sm focus:border-amber-400 focus:outline-none"
              placeholder={action === 'request_revision' ? 'Explain what needs to be revised…' : 'Any additional feedback…'}
              required={action === 'request_revision'}
            />
          </div>

          {error && <p className="mb-2 text-xs text-red-600">{error}</p>}

          <div className="flex gap-2">
            <button
              onClick={() => submit(action)}
              disabled={loading || (action === 'request_revision' && !notes.trim())}
              className="rounded-lg bg-stone-800 px-3 py-1.5 text-xs font-semibold text-white hover:bg-stone-900 disabled:opacity-50"
            >
              {loading ? 'Saving…' : 'Confirm'}
            </button>
            <button
              onClick={() => { setAction(null); setError('') }}
              className="rounded-lg border border-stone-300 px-3 py-1.5 text-xs font-medium text-stone-600 hover:bg-stone-100"
            >
              Cancel
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
