'use client'

import { useEffect, useState } from 'react'
import { surveyContent, type SurveyPhase } from '@/lib/surveys'

const CODE_KEY = 'vfg-participant-code'

export default function SurveyForm({
  exercise,
  phase,
  readOnly = false,
}: {
  exercise: number
  phase: SurveyPhase
  readOnly?: boolean
}) {
  const content = surveyContent[phase]
  const [code, setCode] = useState('')

  useEffect(() => {
    setCode(window.sessionStorage.getItem(CODE_KEY) ?? '')
  }, [])
  const [answers, setAnswers] = useState<Record<string, string | number>>({})
  const [status, setStatus] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle')
  const [error, setError] = useState('')

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault()
    if (readOnly) return
    setStatus('saving')
    setError('')
    const res = await fetch('/api/surveys', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ exercise, phase, participantCode: code, answers }),
    })
    const data = await res.json().catch(() => ({}))
    if (!res.ok) {
      setError(typeof data.error === 'string' ? data.error : 'Could not save the survey.')
      setStatus('error')
      return
    }
    window.sessionStorage.setItem(CODE_KEY, code.trim())
    setStatus('saved')
  }

  return (
    <form onSubmit={handleSubmit} className="mb-6 rounded-2xl border border-stone-200 bg-white p-6 shadow-sm">
      <h2 className="text-xs font-semibold uppercase tracking-widest text-stone-400">{content.title}</h2>
      <p className="mt-1 text-sm text-stone-500">{content.detail}</p>
      <label className="mt-4 block text-sm text-stone-700">
        Linking code
        <input
          value={code}
          onChange={(event) => setCode(event.target.value)}
          required
          readOnly={readOnly}
          autoComplete="off"
          spellCheck={false}
          placeholder="A code you can recreate, not your name"
          className="mt-1 w-full rounded-lg border border-stone-200 bg-stone-50 px-3 py-2 text-sm outline-none focus:border-amber-500 focus:bg-white"
        />
      </label>
      <div className="mt-4 space-y-4">
        {content.questions.map((question) => (
          <label key={question.id} className="block text-sm text-stone-700">
            {question.label}
            {question.type === 'scale' ? (
              <input
                type="number"
                required={!question.optional}
                min={question.min}
                max={question.max}
                readOnly={readOnly}
                value={answers[question.id] ?? ''}
                onChange={(event) => {
                  const next = event.target.value === '' ? '' : Number(event.target.value)
                  setAnswers((current) => ({ ...current, [question.id]: next }))
                }}
                className="mt-1 w-32 rounded-lg border border-stone-200 bg-stone-50 px-3 py-2 text-sm outline-none focus:border-amber-500 focus:bg-white"
              />
            ) : (
              <textarea
                required={!question.optional}
                readOnly={readOnly}
                maxLength={question.maxLength ?? 2000}
                value={typeof answers[question.id] === 'string' ? answers[question.id] : ''}
                onChange={(event) => setAnswers((current) => ({ ...current, [question.id]: event.target.value }))}
                rows={3}
                className="mt-1 w-full rounded-lg border border-stone-200 bg-stone-50 px-3 py-2 text-sm outline-none focus:border-amber-500 focus:bg-white"
              />
            )}
          </label>
        ))}
      </div>
      {readOnly ? (
        <p className="mt-4 text-xs text-stone-400">Students submit this from their own account.</p>
      ) : (
        <button
          type="submit"
          disabled={status === 'saving'}
          className="mt-4 rounded-lg bg-stone-900 px-4 py-2 text-sm font-semibold text-white hover:bg-stone-700 disabled:opacity-60"
        >
          {status === 'saving' ? 'Saving…' : status === 'saved' ? 'Saved' : 'Submit survey'}
        </button>
      )}
      {status === 'error' && <p className="mt-3 text-sm text-red-600">{error}</p>}
    </form>
  )
}
