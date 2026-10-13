import { surveyHref, type SurveyPhase } from '@/lib/study'

const COPY: Record<SurveyPhase, { title: string; detail: string }> = {
  pre: { title: 'Before you start', detail: 'Short optional survey' },
  mid: { title: 'Check in', detail: 'Short optional survey' },
  post: { title: 'Exit ticket', detail: 'Short optional survey' },
}

export default function SurveyLink({
  exercise,
  phase,
  className = '',
}: {
  exercise: number
  phase: SurveyPhase
  className?: string
}) {
  const href = surveyHref(exercise, phase)
  if (!href) return null

  const copy = COPY[phase]
  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      className={`flex items-center gap-3 rounded-xl border border-stone-200 bg-white px-4 py-3 text-sm text-stone-700 shadow-sm transition hover:border-amber-300 hover:bg-amber-50 ${className}`}
    >
      <span className="font-medium text-stone-800">{copy.title}</span>
      <span className="text-xs text-stone-400">{copy.detail}</span>
      <span className="ml-auto text-xs text-stone-400">↗</span>
    </a>
  )
}
