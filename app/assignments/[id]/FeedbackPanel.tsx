'use client'

/**
 * FeedbackPanel — formative pre-submission feedback using the AI feedback engine.
 *
 * Students upload a draft PDF and receive structured AI feedback immediately.
 * No grade or score is ever shown; feedback is never stored.
 * Sits above the formal SubmitPanel on the assignment page.
 */

import { useState, useRef } from 'react'
import type { FeedbackResult } from '@/lib/gemini'

type Props = {
  assignmentId: string
}

export default function FeedbackPanel({ assignmentId }: Props) {
  const [file, setFile] = useState<File | null>(null)
  const [dragging, setDragging] = useState(false)
  const [loading, setLoading] = useState(false)
  const [feedback, setFeedback] = useState<FeedbackResult | null>(null)
  const [error, setError] = useState<string | null>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  function handleFile(f: File | null) {
    setError(null)
    setFeedback(null)
    if (!f) return
    if (!f.name.toLowerCase().endsWith('.pdf') && f.type !== 'application/pdf') {
      setError('Only PDF files are accepted.')
      return
    }
    if (f.size > 10 * 1024 * 1024) {
      setError('Draft file must be under 10 MB.')
      return
    }
    setFile(f)
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!file) return
    setLoading(true)
    setError(null)
    setFeedback(null)

    try {
      const form = new FormData()
      form.append('assignmentId', assignmentId)
      form.append('file', file)

      const res = await fetch('/api/feedback', { method: 'POST', body: form })
      const data = await res.json()

      if (!res.ok) {
        setError(data.error ?? 'Feedback request failed.')
      } else {
        setFeedback(data.feedback as FeedbackResult)
      }
    } catch {
      setError('Network error — please try again.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="rounded-2xl border border-stone-200 bg-white p-6 shadow-sm space-y-5">
      <div>
        <h3 className="text-xs font-semibold uppercase tracking-widest text-stone-400 mb-1">AI Draft Feedback</h3>
        <p className="text-sm text-stone-500 leading-relaxed">
          Upload a draft to receive formative feedback before formal submission. No score is recorded.
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-3">
        <div
          onDragOver={(e) => { e.preventDefault(); setDragging(true) }}
          onDragLeave={() => setDragging(false)}
          onDrop={(e) => {
            e.preventDefault()
            setDragging(false)
            handleFile(e.dataTransfer.files[0] ?? null)
          }}
          onClick={() => inputRef.current?.click()}
          className={`border-2 border-dashed rounded-xl p-5 text-center cursor-pointer transition-colors ${
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
            accept=".pdf,application/pdf"
            className="hidden"
            onChange={(e) => handleFile(e.target.files?.[0] ?? null)}
          />
          {file ? (
            <p className="text-sm text-emerald-700 font-medium">{file.name}</p>
          ) : (
            <p className="text-sm text-stone-400">Drop draft PDF here or click to browse</p>
          )}
        </div>

        {error && (
          <p className="rounded-xl border border-red-100 bg-red-50 px-4 py-3 text-sm text-red-600">{error}</p>
        )}

        <button
          type="submit"
          disabled={!file || loading}
          className="w-full rounded-xl border border-stone-200 bg-stone-50 px-4 py-2.5 text-sm font-semibold text-stone-700 hover:bg-stone-100 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          {loading ? 'Analysing draft…' : 'Get AI Feedback'}
        </button>
      </form>

      {/* Feedback results */}
      {feedback && (
        <div className="space-y-4 pt-1 border-t border-stone-100">

          {feedback.strengths.length > 0 && (
            <div>
              <p className="text-xs font-semibold uppercase tracking-widest text-emerald-600 mb-2">Strengths</p>
              <ul className="space-y-1.5">
                {feedback.strengths.map((s, i) => (
                  <li key={i} className="flex gap-2.5 text-sm text-stone-700">
                    <span className="shrink-0 text-emerald-500 mt-0.5">✓</span>
                    <span>{s}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {feedback.areas_for_improvement.length > 0 && (
            <div>
              <p className="text-xs font-semibold uppercase tracking-widest text-amber-600 mb-2">Areas to Improve</p>
              <ul className="space-y-1.5">
                {feedback.areas_for_improvement.map((a, i) => (
                  <li key={i} className="flex gap-2.5 text-sm text-stone-700">
                    <span className="shrink-0 text-amber-500 mt-0.5">→</span>
                    <span>{a}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {feedback.specific_suggestions.length > 0 && (
            <div>
              <p className="text-xs font-semibold uppercase tracking-widest text-sky-600 mb-2">Suggestions</p>
              <ul className="space-y-1.5">
                {feedback.specific_suggestions.map((s, i) => (
                  <li key={i} className="flex gap-2.5 text-sm text-stone-700">
                    <span className="shrink-0 text-sky-400 mt-0.5">•</span>
                    <span>{s}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {feedback.overall_encouragement && (
            <p className="text-sm italic text-stone-500 border-l-2 border-stone-200 pl-3 leading-relaxed">
              {feedback.overall_encouragement}
            </p>
          )}

          <p className="text-xs text-stone-300">
            AI-generated feedback · not a grade
          </p>
        </div>
      )}
    </div>
  )
}
