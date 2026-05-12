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
    <div className="rounded-xl border border-amber-200 bg-amber-50 p-5 space-y-4">
      <div>
        <h3 className="font-semibold text-amber-900 text-base">Get AI Feedback on a Draft</h3>
        <p className="text-sm text-amber-700 mt-0.5">
          Upload a draft PDF to receive formative feedback before your formal submission.
          No grade is recorded — this is a learning tool only.
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-3">
        {/* Drop zone */}
        <div
          onDragOver={(e) => { e.preventDefault(); setDragging(true) }}
          onDragLeave={() => setDragging(false)}
          onDrop={(e) => {
            e.preventDefault()
            setDragging(false)
            handleFile(e.dataTransfer.files[0] ?? null)
          }}
          onClick={() => inputRef.current?.click()}
          className={`border-2 border-dashed rounded-lg p-5 text-center cursor-pointer transition-colors ${
            dragging
              ? 'border-amber-500 bg-amber-100'
              : file
              ? 'border-amber-400 bg-amber-50'
              : 'border-amber-300 hover:border-amber-400 bg-white'
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
            <p className="text-sm text-amber-800 font-medium">{file.name}</p>
          ) : (
            <p className="text-sm text-amber-600">Drop draft PDF here or click to browse</p>
          )}
        </div>

        {error && <p className="text-sm text-red-600">{error}</p>}

        <button
          type="submit"
          disabled={!file || loading}
          className="w-full rounded-lg bg-amber-500 text-white text-sm font-semibold py-2.5 hover:bg-amber-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          {loading ? 'Analysing draft…' : 'Get AI Feedback'}
        </button>
      </form>

      {/* Feedback display */}
      {feedback && (
        <div className="space-y-4 pt-1">
          <hr className="border-amber-200" />

          {feedback.strengths.length > 0 && (
            <div>
              <h4 className="text-sm font-semibold text-emerald-800 mb-1.5">Strengths</h4>
              <ul className="space-y-1">
                {feedback.strengths.map((s, i) => (
                  <li key={i} className="flex gap-2 text-sm text-stone-700">
                    <span className="text-emerald-500 mt-0.5 shrink-0">✓</span>
                    <span>{s}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {feedback.areas_for_improvement.length > 0 && (
            <div>
              <h4 className="text-sm font-semibold text-amber-800 mb-1.5">Areas to Improve</h4>
              <ul className="space-y-1">
                {feedback.areas_for_improvement.map((a, i) => (
                  <li key={i} className="flex gap-2 text-sm text-stone-700">
                    <span className="text-amber-500 mt-0.5 shrink-0">→</span>
                    <span>{a}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {feedback.specific_suggestions.length > 0 && (
            <div>
              <h4 className="text-sm font-semibold text-sky-800 mb-1.5">Specific Suggestions</h4>
              <ul className="space-y-1">
                {feedback.specific_suggestions.map((s, i) => (
                  <li key={i} className="flex gap-2 text-sm text-stone-700">
                    <span className="text-sky-500 mt-0.5 shrink-0">•</span>
                    <span>{s}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {feedback.overall_encouragement && (
            <p className="text-sm italic text-stone-600 border-l-2 border-amber-300 pl-3">
              {feedback.overall_encouragement}
            </p>
          )}

          <p className="text-xs text-stone-400">
            This feedback is generated by AI and is not a grade. Submit your revised work below when ready.
          </p>
        </div>
      )}
    </div>
  )
}
