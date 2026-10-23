import type { GradeComparison } from '@/lib/grade-compare'

export default function GradeCompare({ summary }: { summary: GradeComparison }) {
  return (
    <section className="mb-8 rounded-2xl border border-stone-200 bg-white p-6 shadow-sm">
      <h2 className="text-xs font-semibold uppercase tracking-widest text-stone-400">AI draft and instructor grade</h2>
      <p className="mt-2 text-sm leading-relaxed text-stone-600">
        The Gemini draft and the instructor’s final grade are stored separately. This view is the comparison across the course. It has no student names and no row-level grades.
      </p>
      {summary.suppressed ? (
        <p className="mt-3 text-sm text-stone-600">Fewer than 5 paired grades (hidden).</p>
      ) : (
        <ul className="mt-3 space-y-1 text-sm text-stone-700">
          <li>Paired grades: {summary.n}</li>
          <li>Mean AI draft: {summary.meanAi.toFixed(1)}</li>
          <li>Mean instructor grade: {summary.meanInstructor.toFixed(1)}</li>
          <li>Mean absolute difference: {summary.meanAbsoluteDifference.toFixed(1)}</li>
        </ul>
      )}
    </section>
  )
}
