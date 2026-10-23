import { assignments } from '@/lib/assignments'
import type { InstructorAggregateGroup } from '@/lib/study-access'

const PHASE_LABEL = {
  pre: 'Before you start',
  mid: 'Check in',
  post: 'Exit ticket',
} as const

export default function AggregateView({ groups }: { groups: InstructorAggregateGroup[] }) {
  if (groups.length === 0) {
    return <p className="text-sm text-stone-500">No survey responses yet.</p>
  }

  return (
    <div className="space-y-4">
      {groups.map((group) => {
        const title = assignments.find((assignment) => assignment.sequence === group.exercise)?.title
        return (
          <section key={`${group.exercise}-${group.phase}`} className="rounded-2xl border border-stone-200 bg-white p-6 shadow-sm">
            <h2 className="text-sm font-semibold text-stone-800">
              Exercise {group.exercise}
              {title ? `: ${title}` : ''}
            </h2>
            <p className="mt-1 text-xs font-semibold uppercase tracking-widest text-stone-400">{PHASE_LABEL[group.phase]}</p>
            <p className="mt-3 text-sm text-stone-600">
              Responses:{' '}
              {group.responses.suppressed ? 'fewer than 5 (hidden)' : group.responses.n}
            </p>
            <ul className="mt-3 space-y-2">
              {group.numeric.map((item) => (
                <li key={item.id} className="text-sm text-stone-600">
                  <span className="text-stone-800">{item.label}</span>
                  {item.summary.suppressed ? (
                    <span> — hidden (fewer than 5)</span>
                  ) : (
                    <span>
                      {' '}
                      — mean {item.summary.mean.toFixed(1)}, min {item.summary.min}, max {item.summary.max}, n {item.summary.n}
                    </span>
                  )}
                </li>
              ))}
            </ul>
          </section>
        )
      })}
    </div>
  )
}
