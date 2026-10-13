import { redirect } from 'next/navigation'
import { getServerSession } from 'next-auth/next'
import { authOptions } from '@/lib/auth'
import { loadGradeComparison, loadInstructorAggregate, readGradesPosted } from '@/lib/research'
import { homeForRole, sessionRole } from '@/lib/session'
import AggregateView from './AggregateView'
import GradeCompare from './GradeCompare'
import GradesReleaseButton from './GradesReleaseButton'

export default async function StudyPage() {
  const session = await getServerSession(authOptions)
  const role = sessionRole(session)
  if (role !== 'instructor' && role !== 'consent_holder') redirect(homeForRole(role))

  const [aggregate, gradesPosted, comparison] = await Promise.all([
    loadInstructorAggregate(role),
    readGradesPosted(),
    loadGradeComparison(role),
  ])
  if (!aggregate.allowed || !comparison.allowed) redirect(homeForRole(role))

  return (
    <div className="mx-auto w-full max-w-4xl px-4 sm:px-6 py-10">
      <p className="text-xs font-semibold uppercase tracking-widest text-stone-400 mb-1">Study</p>
      <h1 className="text-2xl font-semibold tracking-tight text-stone-900">Survey totals</h1>
      <p className="mt-2 mb-8 text-sm leading-relaxed text-stone-500">
        Counts and numeric summaries only. A cell with fewer than 5 responses is hidden, including the exact count. Written answers are not shown.
      </p>
      <div className="mb-8">
        <GradesReleaseButton gradesPosted={gradesPosted} />
      </div>
      <GradeCompare summary={comparison.summary} />
      <AggregateView groups={aggregate.groups} />
    </div>
  )
}
