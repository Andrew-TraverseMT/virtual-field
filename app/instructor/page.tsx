import { getServerSession } from 'next-auth/next'
import { authOptions } from '@/lib/auth'
import { redirect } from 'next/navigation'
import { sql } from '@/lib/db'
import { getAssignment } from '@/lib/assignments'
import type { Submission } from '@/lib/db'
import GradeActions from './GradeActions'
import ReGradeButton from './ReGradeButton'

type FullSubmission = Submission & { student_name: string; student_email: string }

type RubricScore = {
  criterion_id: string
  label: string
  points_earned: number
  points_available: number
  justification: string
}

const STATUS_CONFIG: Record<string, { label: string; className: string; note?: string }> = {
  pending:    { label: 'Pending', className: 'bg-sky-50 text-sky-700 ring-1 ring-sky-200', note: 'Awaiting AI grading' },
  ai_graded:  { label: 'AI Graded', className: 'bg-violet-50 text-violet-700 ring-1 ring-violet-200', note: 'Review & approve before student sees grade' },
  graded:     { label: 'Grade Modified', className: 'bg-amber-50 text-amber-700 ring-1 ring-amber-200' },
  approved:   { label: 'Approved', className: 'bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200' },
  revision_requested: { label: 'Revision Requested', className: 'bg-orange-50 text-orange-700 ring-1 ring-orange-200' },
}

export default async function InstructorPage({
  searchParams,
}: {
  searchParams: Promise<{ filter?: string }>
}) {
  const session = await getServerSession(authOptions)
  if (!session || (session.user as { role?: string }).role !== 'instructor') {
    redirect('/login')
  }

  const { filter } = await searchParams

  const { rows } = await sql`
    SELECT s.*, st.name as student_name, st.email as student_email
    FROM submissions s
    JOIN students st ON st.id = s.student_id
    ORDER BY s.submitted_at DESC
  `
  const submissionsRaw = rows as FullSubmission[]

  const submissions = filter
    ? submissionsRaw.filter((s) => s.status === filter)
    : submissionsRaw

  const counts = {
    all: submissionsRaw.length,
    pending: submissionsRaw.filter((s) => s.status === 'pending').length,
    ai_graded: submissionsRaw.filter((s) => s.status === 'ai_graded').length,
    approved: submissionsRaw.filter((s) => s.status === 'approved').length,
    revision_requested: submissionsRaw.filter((s) => s.status === 'revision_requested').length,
  }

  const FILTER_TABS = [
    { key: '', label: 'All', count: counts.all },
    { key: 'pending', label: 'Pending', count: counts.pending },
    { key: 'ai_graded', label: 'Needs Review', count: counts.ai_graded },
    { key: 'approved', label: 'Approved', count: counts.approved },
    { key: 'revision_requested', label: 'Revision Requested', count: counts.revision_requested },
  ]

  return (
    <div className="mx-auto w-full max-w-6xl px-4 sm:px-6 py-10">

      <div className="mb-8">
        <h1 className="text-2xl font-semibold tracking-tight text-stone-900">Instructor Portal</h1>
        <p className="mt-1 text-sm text-stone-400">
          Review student submissions, approve grades, or request revisions.
        </p>
      </div>

      {/* Stats row */}
      <div className="mb-8 grid grid-cols-2 gap-3 sm:grid-cols-4">
        <div className="rounded-2xl border border-stone-200 bg-white p-5 text-center shadow-sm">
          <div className="text-3xl font-semibold text-stone-900 tabular-nums">{counts.all}</div>
          <div className="mt-0.5 text-xs font-medium text-stone-400">Total</div>
        </div>
        <div className="rounded-2xl border border-violet-100 bg-violet-50/60 p-5 text-center">
          <div className="text-3xl font-semibold text-violet-700 tabular-nums">{counts.ai_graded}</div>
          <div className="mt-0.5 text-xs font-medium text-violet-400">Needs Review</div>
        </div>
        <div className="rounded-2xl border border-emerald-100 bg-emerald-50/60 p-5 text-center">
          <div className="text-3xl font-semibold text-emerald-700 tabular-nums">{counts.approved}</div>
          <div className="mt-0.5 text-xs font-medium text-emerald-400">Approved</div>
        </div>
        <div className="rounded-2xl border border-orange-100 bg-orange-50/60 p-5 text-center">
          <div className="text-3xl font-semibold text-orange-700 tabular-nums">{counts.revision_requested}</div>
          <div className="mt-0.5 text-xs font-medium text-orange-400">Needs Revision</div>
        </div>
      </div>

      {/* Filter tabs */}
      <div className="mb-6 flex flex-wrap gap-2">
        {FILTER_TABS.map((tab) => (
          <a
            key={tab.key}
            href={tab.key ? `?filter=${tab.key}` : '/instructor'}
            className={`inline-flex items-center gap-1.5 rounded-full border px-3.5 py-1.5 text-sm font-medium transition-colors ${
              (filter ?? '') === tab.key
                ? 'border-stone-900 bg-stone-900 text-white'
                : 'border-stone-200 bg-white text-stone-500 hover:border-stone-300 hover:text-stone-700'
            }`}
          >
            {tab.label}
            <span className={`rounded-full px-1.5 py-0.5 text-[11px] font-semibold tabular-nums ${
              (filter ?? '') === tab.key
                ? 'bg-white/20 text-white'
                : 'bg-stone-100 text-stone-500'
            }`}>
              {tab.count}
            </span>
          </a>
        ))}
      </div>

      {/* Submission list */}
      {submissions.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-stone-200 bg-white p-16 text-center">
          <p className="text-sm text-stone-400">No submissions match this filter.</p>
        </div>
      ) : (
        <div className="space-y-4">
          {submissions.map((sub) => {
            const assignment = getAssignment(sub.assignment_id)
            if (!assignment) return null

            const statusCfg = STATUS_CONFIG[sub.status] ?? STATUS_CONFIG.pending
            const displayGrade = sub.instructor_grade ?? sub.ai_grade
            const submittedDate = new Date(sub.submitted_at * 1000).toLocaleDateString('en-US', {
              month: 'short',
              day: 'numeric',
              year: 'numeric',
            })
            const rubricScores: RubricScore[] = sub.ai_rubric_scores
              ? (JSON.parse(sub.ai_rubric_scores) as RubricScore[])
              : []

            return (
              <div
                key={sub.id}
                className="rounded-2xl border border-stone-200 bg-white p-6 shadow-sm"
              >
                <div className="flex flex-col gap-5 sm:flex-row sm:items-start sm:justify-between">
                  <div className="flex-1 min-w-0">

                    {/* Status + meta row */}
                    <div className="mb-3 flex flex-wrap items-center gap-2">
                      <span className={`rounded-full px-2.5 py-0.5 text-[11px] font-semibold ${statusCfg.className}`}>
                        {statusCfg.label}
                      </span>
                      {statusCfg.note && (
                        <span className="text-xs text-stone-400 italic">{statusCfg.note}</span>
                      )}
                      <span className="text-xs text-stone-300">·</span>
                      <span className="text-xs text-stone-400">{submittedDate}</span>
                      {sub.file_name && (
                        <>
                          <span className="text-xs text-stone-300">·</span>
                          <span className="text-xs text-stone-400 truncate max-w-[200px]">{sub.file_name}</span>
                        </>
                      )}
                    </div>

                    {/* Assignment + student */}
                    <h3 className="font-semibold text-stone-900 text-base">
                      {assignment.title}
                    </h3>
                    <p className="mt-0.5 text-sm text-stone-400">
                      <span className="font-medium text-stone-600">{sub.student_name}</span>
                      <span className="ml-2">{sub.student_email}</span>
                    </p>

                    {/* Grade */}
                    {displayGrade !== null && (
                      <p className="mt-2 text-sm text-stone-500">
                        {sub.instructor_grade !== null ? 'Instructor grade' : 'AI provisional grade'}:{' '}
                        <span className="font-semibold text-stone-800 tabular-nums">
                          {displayGrade}/{assignment.rubric.totalPoints}
                        </span>
                        {sub.status === 'ai_graded' && (
                          <span className="ml-2 text-xs text-violet-500">(not visible to student)</span>
                        )}
                      </p>
                    )}

                    {/* AI rubric breakdown */}
                    {rubricScores.length > 0 && (
                      <div className="mt-4 rounded-xl border border-violet-100 bg-violet-50/60 p-4">
                        <p className="text-xs font-semibold uppercase tracking-widest text-violet-500 mb-3">AI Rubric Breakdown</p>
                        <div className="space-y-2">
                          {rubricScores.map((score) => (
                            <div key={score.criterion_id} className="flex gap-3 text-xs">
                              <span className="shrink-0 font-semibold text-violet-700 tabular-nums w-10 text-right">
                                {score.points_earned}/{score.points_available}
                              </span>
                              <span className="text-stone-500 leading-relaxed">
                                <span className="font-medium text-stone-700">{score.label}</span>
                                {' — '}{score.justification}
                              </span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* AI overall feedback */}
                    {sub.ai_feedback && (
                      <div className="mt-3 rounded-xl bg-stone-50 p-4">
                        <p className="text-xs font-semibold uppercase tracking-widest text-stone-400 mb-2">AI Feedback</p>
                        <p className="text-xs text-stone-500 whitespace-pre-line leading-relaxed">{sub.ai_feedback}</p>
                      </div>
                    )}

                    {/* Instructor notes */}
                    {sub.instructor_notes && (
                      <div className="mt-3 rounded-xl border border-amber-100 bg-amber-50/60 p-4">
                        <p className="text-xs font-semibold uppercase tracking-widest text-amber-600 mb-2">Your Notes</p>
                        <p className="text-xs text-stone-500 leading-relaxed">{sub.instructor_notes}</p>
                      </div>
                    )}
                  </div>

                  {/* Action panel */}
                  <div className="shrink-0 sm:w-52 space-y-2">
                    {sub.status === 'pending' && sub.file_name && (
                      <ReGradeButton submissionId={sub.id} />
                    )}
                    <GradeActions
                      submissionId={sub.id}
                      currentStatus={sub.status}
                      currentGrade={displayGrade ?? null}
                      totalPoints={assignment.rubric.totalPoints}
                    />
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
