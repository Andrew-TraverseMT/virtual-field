'use client'

import { useState } from 'react'
import type { Assignment } from '@/lib/assignments'

type Props = {
  assignment: Assignment
  gradePrompt: string
  feedbackPrompt: string
}

const TYPE_LABEL: Record<string, string> = {
  'virtual-landscape': 'Virtual Landscape',
  'visible-geology': 'Visible Geology',
  'cyoa': 'Choose Your Own Adventure',
}

export function AssignmentCard({ assignment, gradePrompt, feedbackPrompt }: Props) {
  const [open, setOpen] = useState(false)
  const [tab, setTab] = useState<'details' | 'grade' | 'feedback'>('details')

  return (
    <div className="rounded-2xl border border-stone-200 bg-white shadow-sm overflow-hidden">
      {/* Header row */}
      <button
        onClick={() => setOpen((o) => !o)}
        className="w-full flex items-start gap-4 px-6 py-5 text-left hover:bg-stone-50 transition-colors"
      >
        <div className="flex-none w-8 h-8 rounded-full bg-amber-100 flex items-center justify-center text-sm font-bold text-amber-800 mt-0.5">
          {assignment.sequence}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-xs font-medium text-stone-400">Week {assignment.week}</span>
            <span className="text-stone-200">·</span>
            <span className="text-xs font-medium text-stone-400">{TYPE_LABEL[assignment.type] ?? assignment.type}</span>
            <span className="text-stone-200">·</span>
            <span className="text-xs font-medium text-stone-400">{assignment.rubric.totalPoints} pts</span>
          </div>
          <div className="mt-0.5 font-semibold text-stone-900 truncate">{assignment.title}</div>
          <div className="text-sm text-stone-500 truncate">{assignment.subtitle}</div>
        </div>
        <div className={`flex-none text-stone-400 transition-transform mt-1 ${open ? 'rotate-180' : ''}`}>
          <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor">
            <path d="M8 10.5 L3 5.5 L4.4 4.1 L8 7.7 L11.6 4.1 L13 5.5 Z" />
          </svg>
        </div>
      </button>

      {open && (
        <div className="border-t border-stone-100">
          {/* Tab bar */}
          <div className="flex border-b border-stone-100 px-6">
            {(['details', 'grade', 'feedback'] as const).map((t) => (
              <button
                key={t}
                onClick={() => setTab(t)}
                className={`py-3 pr-5 text-sm font-medium border-b-2 -mb-px transition-colors ${
                  tab === t
                    ? 'border-amber-700 text-amber-800'
                    : 'border-transparent text-stone-400 hover:text-stone-600'
                }`}
              >
                {t === 'details' ? 'Details' : t === 'grade' ? 'Grading prompt' : 'Feedback prompt'}
              </button>
            ))}
          </div>

          <div className="px-6 py-5">
            {tab === 'details' && (
              <div className="space-y-5">
                <p className="text-sm text-stone-600 leading-relaxed">{assignment.description}</p>

                {assignment.attribution && (
                  <div>
                    <div className="text-xs font-semibold uppercase tracking-widest text-stone-400 mb-1">Attribution</div>
                    <p className="text-sm text-stone-500">{assignment.attribution}</p>
                  </div>
                )}

                {(assignment.learningGoals ?? []).length > 0 && (
                  <div>
                    <div className="text-xs font-semibold uppercase tracking-widest text-stone-400 mb-2">Learning goals</div>
                    <ul className="space-y-1">
                      {assignment.learningGoals!.map((g, i) => (
                        <li key={i} className="flex gap-2 text-sm text-stone-600">
                          <span className="text-amber-600 mt-0.5">·</span>
                          <span>{g}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                {(assignment.deliverables ?? []).length > 0 && (
                  <div>
                    <div className="text-xs font-semibold uppercase tracking-widest text-stone-400 mb-2">Deliverables</div>
                    <div className="space-y-2">
                      {assignment.deliverables!.map((d) => (
                        <div key={d.id} className="rounded-lg border border-stone-100 bg-stone-50 px-4 py-3">
                          <div className="text-sm font-medium text-stone-800">{d.label}</div>
                          <div className="text-xs text-stone-500 mt-0.5">{d.description}</div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                <div>
                  <div className="text-xs font-semibold uppercase tracking-widest text-stone-400 mb-2">Rubric — {assignment.rubric.totalPoints} pts total</div>
                  <div className="space-y-2">
                    {assignment.rubric.criteria.map((c) => (
                      <div key={c.id} className="flex gap-3 text-sm">
                        <span className="flex-none rounded bg-amber-50 px-2 py-0.5 text-xs font-semibold text-amber-800 ring-1 ring-amber-200 h-fit mt-0.5">
                          {c.points} pts
                        </span>
                        <div>
                          <span className="font-medium text-stone-800">{c.label}</span>
                          <span className="text-stone-400 mx-1">—</span>
                          <span className="text-stone-500">{c.description}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {tab === 'grade' && (
              <div>
                <p className="text-xs text-stone-400 mb-3">Sent to Gemini 2.5 Pro alongside the student's PDF for formal grading.</p>
                <pre className="whitespace-pre-wrap text-xs text-stone-700 bg-stone-50 rounded-xl border border-stone-100 p-4 font-mono leading-relaxed overflow-x-auto">
                  {gradePrompt}
                </pre>
              </div>
            )}

            {tab === 'feedback' && (
              <div>
                <p className="text-xs text-stone-400 mb-3">Sent to Gemini 2.5 Pro alongside a student draft for formative feedback (never stored).</p>
                <pre className="whitespace-pre-wrap text-xs text-stone-700 bg-stone-50 rounded-xl border border-stone-100 p-4 font-mono leading-relaxed overflow-x-auto">
                  {feedbackPrompt}
                </pre>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
