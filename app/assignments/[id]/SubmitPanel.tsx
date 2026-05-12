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
    <div className="space-y-5">

      {/* Grading-in-progress notice */}
      {(existingStatus === 'pending' || existingStatus === 'ai_graded') && (
        <div className="rounded-2xl border border-violet-100 bg-violet-50/80 p-5">
          <p className="text-sm font-medium text-violet-800 mb-1">
            {existingStatus === 'pending' ? 'Grading in progress' : 'AI grading complete'}
          </p>
          <p className="text-sm text-violet-600 leading-relaxed">
            {existingStatus === 'pending'
              ? 'Your submission is being reviewed by AI. Your instructor will confirm the grade before it\'s released.'
              : 'Graded by AI — awaiting instructor review before your grade is released.'}
          </p>
        </div>
      )}

      {/* Grade & feedback panel */}
      {gradeVisible && (aiGrade !== null || instructorGrade !== null) && (
        <div className="rounded-2xl border border-stone-200 bg-white p-6 shadow-sm">
          <h3 className="text-xs font-semibold uppercase tracking-widest text-stone-400 mb-5">Grading Feedback</h3>

          {/* Score display */}
          <div className="mb-5 flex items-center gap-4">
            <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-2xl bg-stone-900 text-xl font-bold text-white tabular-nums">
              {finalGrade}
            </div>
            <div>
              <p className="text-xs text-stone-400 mb-0.5">
                {instructorGrade !== null ? 'Instructor grade' : 'Grade'}
              </p>
              <p className="text-lg font-semibold text-stone-900 tabular-nums">
                {finalGrade} / {totalPoints}
              </p>
            </div>
            <div className="ml-auto">
              {existingStatus === 'approved' && (
                <span className="rounded-full bg-emerald-50 px-3 py-1 text-xs font-semibold text-emerald-700 ring-1 ring-emerald-200">
                  Approved
                </span>
              )}
              {existingStatus === 'revision_requested' && (
                <span className="rounded-full bg-orange-50 px-3 py-1 text-xs font-semibold text-orange-700 ring-1 ring-orange-200">
                  Revision Needed
                </span>
              )}
            </div>
          </div>

          {instructorNotes && (
            <div className="mb-4 rounded-xl bg-stone-50 p-4">
              <p className="text-xs font-semibold uppercase tracking-widest text-stone-400 mb-2">Instructor Notes</p>
              <p className="text-sm text-stone-700 leading-relaxed">{instructorNotes}</p>
            </div>
          )}

          {aiFeedback && (
            <div className="mb-4 rounded-xl bg-violet-50/60 p-4">
              <p className="text-xs font-semibold uppercase tracking-widest text-violet-500 mb-2">Feedback</p>
              <p className="whitespace-pre-line text-sm text-stone-700 leading-relaxed">{aiFeedback}</p>
            </div>
          )}

          {parsedRubric && parsedRubric.length > 0 && (
            <div>
              <p className="text-xs font-semibold uppercase tracking-widest text-stone-400 mb-3">Criterion Scores</p>
              <div className="space-y-2">
                {parsedRubric.map((score) => (
                  <div key={score.criterion_id} className="rounded-xl bg-stone-50 p-3.5">
                    <div className="flex justify-between items-center mb-1">
                      <span className="text-sm font-medium text-stone-700">{score.label}</span>
                      <span className="text-sm font-bold text-amber-700 tabular-nums">{score.points_earned}/{score.points_available}</span>
                    </div>
                    <p className="text-xs text-stone-400 leading-relaxed">{score.justification}</p>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Submission form */}
      {(!submitted || canResubmit) && (
        <div className="rounded-2xl border border-stone-200 bg-white p-6 shadow-sm">
          <h3 className="text-xs font-semibold uppercase tracking-widest text-stone-400 mb-1">
            {canResubmit ? 'Re-submit Work' : 'Submit Work'}
          </h3>
          <p className="text-sm text-stone-500 mb-5 leading-relaxed">
            Combine all deliverables into a single PDF and upload below.
          </p>

          {canResubmit && (
            <div className="mb-4 rounded-xl border border-orange-100 bg-orange-50 p-4 text-sm text-orange-700">
              Address the instructor feedback above before re-submitting.
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div
              role="button"
              tabIndex={0}
              onClick={() => inputRef.current?.click()}
              onKeyDown={(e) => e.key === 'Enter' && inputRef.current?.click()}
              onDragOver={(e) => { e.preventDefault(); setDragging(true) }}
              onDragLeave={() => setDragging(false)}
              onDrop={handleDrop}
              className={`flex cursor-pointer flex-col items-center justify-center rounded-xl border-2 border-dashed px-4 py-8 text-center transition-colors ${
                dragging
                  ? 'border-amber-500 bg-amber-50'
                  : file
                  ? 'border-emerald-400 bg-emerald-50'
                  : 'border-stone-200 bg-stone-50 hover:border-amber-400 hover:bg-amber-50'
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
              {file ? (
                <>
                  <p className="font-medium text-emerald-700 text-sm">{file.name}</p>
                  <p className="text-xs text-stone-400 mt-1">
                    {(file.size / 1024 / 1024).toFixed(2)} MB · click to change
                  </p>
                </>
              ) : (
                <>
                  <p className="font-medium text-stone-500 text-sm">Drop PDF here or click to browse</p>
                  <p className="text-xs text-stone-400 mt-1">PDF only · max 25 MB</p>
                </>
              )}
            </div>

            {error && (
              <p className="rounded-xl border border-red-100 bg-red-50 px-4 py-3 text-sm text-red-600">{error}</p>
            )}

            {success && (
              <p className="rounded-xl border border-emerald-100 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">
                Submitted — the next assignment is now unlocked.
              </p>
            )}

            <button
              type="submit"
              disabled={submitting || !file}
              className="w-full rounded-xl bg-stone-900 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-stone-800 active:scale-[0.98] disabled:opacity-50"
            >
              {submitting ? 'Uploading…' : 'Submit Assignment'}
            </button>
          </form>
        </div>
      )}

      {/* Submitted, awaiting review */}
      {submitted && existingStatus !== 'revision_requested' && !gradeVisible && existingStatus !== 'pending' && existingStatus !== 'ai_graded' && (
        <div className="rounded-2xl border border-stone-200 bg-white p-5">
          <p className="text-sm font-medium text-stone-700 mb-0.5">Submission received</p>
          <p className="text-sm text-stone-400">
            {existingFileName ? `${existingFileName}` : 'Your work is under review.'} Feedback appears here once released.
          </p>
        </div>
      )}
    </div>
  )
}
