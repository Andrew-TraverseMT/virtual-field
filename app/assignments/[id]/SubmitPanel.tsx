'use client'

import { useState, useRef } from 'react'
import { useRouter } from 'next/navigation'

export default function SubmitPanel({
  assignmentId,
  existingStatus,
  existingFileName,
  aiGrade,
  aiFeedback,
  aiRubricScores,
  instructorGrade,
  instructorNotes,
  totalPoints,
}: {
  assignmentId: string
  existingStatus: string | null
  existingFileName: string | null
  aiGrade: number | null
  aiFeedback: string | null
  aiRubricScores: string | null
  instructorGrade: number | null
  instructorNotes: string | null
  totalPoints: number
}) {
  const router = useRouter()
  const inputRef = useRef<HTMLInputElement>(null)
  const [dragging, setDragging] = useState(false)
  const [file, setFile] = useState<File | null>(null)
  const [submitting, setSubmitting] = useState(false)
  const [success, setSuccess] = useState(false)
  const [error, setError] = useState('')

  const parsedRubric: Array<{ criterion_id: string; label: string; points_earned: number; points_available: number; justification: string }> | null = (() => {
    try {
      return aiRubricScores ? JSON.parse(aiRubricScores) : null
    } catch {
      return null
    }
  })()

  const finalGrade = instructorGrade ?? aiGrade

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!file) {
      setError('Please select a PDF file to submit.')
      return
    }

    setError('')
    setSubmitting(true)

    const fd = new FormData()
    fd.append('assignmentId', assignmentId)
    fd.append('file', file)

    const res = await fetch('/api/submissions', { method: 'POST', body: fd })
    setSubmitting(false)

    if (!res.ok) {
      const data = await res.json().catch(() => ({}))
      setError(data.error ?? 'Submission failed. Please try again.')
      return
    }

    setSuccess(true)
    router.refresh()
  }

  function handleDrop(e: React.DragEvent) {
    e.preventDefault()
    setDragging(false)
    const dropped = e.dataTransfer.files[0]
    if (dropped?.type === 'application/pdf') {
      setFile(dropped)
      setError('')
    } else {
      setError('Only PDF files are accepted.')
    }
  }

  // If revision is requested, allow re-submission
  const canResubmit = existingStatus === 'revision_requested'
  const submitted = existingStatus && !canResubmit

  // Only show grade/feedback after instructor has approved or modified it.
  // 'ai_graded' and 'pending' are held from the student view.
  const gradeVisible = existingStatus === 'approved' || existingStatus === 'graded' || canResubmit

  return (
    <div className="space-y-6">
      {/* Grading-in-progress notice */}
      {(existingStatus === 'pending' || existingStatus === 'ai_graded') && (
        <div className="rounded-xl border border-violet-200 bg-violet-50 p-4 text-sm text-violet-700">
          <div className="font-semibold mb-0.5">
            {existingStatus === 'pending' ? '⏳ Grading in progress…' : '✦ AI grading complete'}
          </div>
          <p className="text-violet-600">
            {existingStatus === 'pending'
              ? 'Your submission is being graded by AI. Your instructor will review and confirm the grade before it is released to you.'
              : 'Your work has been graded by AI and is awaiting your instructor\'s review. Your grade will be released once confirmed.'}
          </p>
        </div>
      )}

      {/* Feedback panel — shown only after instructor has approved/graded */}
      {gradeVisible && (aiGrade !== null || instructorGrade !== null) && (
        <div className="rounded-xl border border-stone-200 bg-white p-5 shadow-sm">
          <h3 className="mb-4 font-semibold text-stone-700">Grading Feedback</h3>

          <div className="mb-4 flex items-center gap-3">
            <div className="flex h-14 w-14 items-center justify-center rounded-full bg-amber-50 text-2xl font-bold text-amber-700">
              {finalGrade}
            </div>
            <div>
              <div className="text-sm text-stone-500">
                {instructorGrade !== null ? 'Instructor grade' : 'AI provisional grade'}
              </div>
              <div className="text-sm font-medium text-stone-700">out of {totalPoints} points</div>
            </div>
            {existingStatus === 'approved' && (
              <span className="ml-auto rounded-full bg-emerald-100 px-3 py-1 text-sm font-semibold text-emerald-700">
                ✓ Approved
              </span>
            )}
            {existingStatus === 'revision_requested' && (
              <span className="ml-auto rounded-full bg-orange-100 px-3 py-1 text-sm font-semibold text-orange-700">
                ↩ Revision Requested
              </span>
            )}
          </div>

          {instructorNotes && (
            <div className="mb-3 rounded-lg bg-stone-50 p-3">
              <div className="mb-1 text-xs font-semibold uppercase tracking-wide text-stone-500">
                Instructor Notes
              </div>
              <p className="text-sm text-stone-700">{instructorNotes}</p>
            </div>
          )}

          {aiFeedback && (
            <div className="rounded-lg bg-violet-50 p-3">
              <div className="mb-1 text-xs font-semibold uppercase tracking-wide text-violet-600">
                AI Feedback
              </div>
              <p className="whitespace-pre-line text-sm text-stone-700">{aiFeedback}</p>
            </div>
          )}

          {parsedRubric && parsedRubric.length > 0 && (
            <div className="mt-3">
              <div className="mb-2 text-xs font-semibold uppercase tracking-wide text-stone-500">
                Criterion Scores
              </div>
              <div className="space-y-2">
                {parsedRubric.map((score) => (
                  <div key={score.criterion_id} className="rounded-lg bg-stone-50 p-2.5">
                    <div className="flex justify-between text-sm mb-0.5">
                      <span className="font-medium text-stone-700">{score.label}</span>
                      <span className="font-bold text-amber-700">{score.points_earned}/{score.points_available}</span>
                    </div>
                    <p className="text-xs text-stone-500">{score.justification}</p>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Submission form */}
      {(!submitted || canResubmit) && (
        <div className="rounded-xl border border-stone-200 bg-white p-5 shadow-sm">
          <h3 className="mb-1 font-semibold text-stone-700">
            {canResubmit ? 'Re-submit Your Work' : 'Submit Your Work'}
          </h3>
          <p className="mb-4 text-sm text-stone-500">
            Combine all deliverables into a single PDF and upload below.
            Submitting will unlock the next assignment immediately.
          </p>

          {canResubmit && (
            <div className="mb-4 rounded-lg bg-orange-50 p-3 text-sm text-orange-700">
              Your instructor has requested revisions. Please address the feedback above
              before re-submitting.
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Drop zone */}
            <div
              role="button"
              tabIndex={0}
              onClick={() => inputRef.current?.click()}
              onKeyDown={(e) => e.key === 'Enter' && inputRef.current?.click()}
              onDragOver={(e) => { e.preventDefault(); setDragging(true) }}
              onDragLeave={() => setDragging(false)}
              onDrop={handleDrop}
              className={`flex cursor-pointer flex-col items-center justify-center rounded-xl border-2 border-dashed p-8 text-center transition ${
                dragging
                  ? 'border-amber-400 bg-amber-50'
                  : file
                  ? 'border-emerald-400 bg-emerald-50'
                  : 'border-stone-300 bg-stone-50 hover:border-amber-400 hover:bg-amber-50'
              }`}
            >
              <input
                ref={inputRef}
                type="file"
                accept="application/pdf,.pdf"
                className="hidden"
                onChange={(e) => {
                  const f = e.target.files?.[0]
                  if (f) { setFile(f); setError('') }
                }}
              />
              <div className="mb-2 text-3xl">{file ? '📄' : '⬆️'}</div>
              {file ? (
                <>
                  <p className="font-medium text-emerald-700">{file.name}</p>
                  <p className="text-xs text-stone-500">
                    {(file.size / 1024 / 1024).toFixed(2)} MB · Click to change
                  </p>
                </>
              ) : (
                <>
                  <p className="font-medium text-stone-600">Drop your PDF here or click to browse</p>
                  <p className="text-xs text-stone-400">PDF only · max 25 MB</p>
                </>
              )}
            </div>

            {error && (
              <p className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-600">{error}</p>
            )}

            {success && (
              <p className="rounded-md bg-emerald-50 px-3 py-2 text-sm text-emerald-700">
                ✓ Submitted successfully! The next assignment is now unlocked.
              </p>
            )}

            <button
              type="submit"
              disabled={submitting || !file}
              className="w-full rounded-lg bg-amber-600 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-amber-700 disabled:opacity-60"
            >
              {submitting ? 'Uploading…' : 'Submit Assignment'}
            </button>
          </form>
        </div>
      )}

      {/* Already submitted and no revision needed */}
      {submitted && existingStatus !== 'revision_requested' && aiGrade === null && instructorGrade === null && (
        <div className="rounded-xl border border-sky-200 bg-sky-50 p-5">
          <div className="flex items-center gap-3">
            <div className="text-2xl">🕐</div>
            <div>
              <p className="font-medium text-sky-800">Submission received</p>
              <p className="text-sm text-sky-600">
                {existingFileName
                  ? `File: ${existingFileName}`
                  : 'Your submission is being reviewed.'}
                {' '}Feedback will appear here once graded.
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
