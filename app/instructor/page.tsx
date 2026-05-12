import { getServerSession } from 'next-auth/next'
import { authOptions } from '@/lib/auth'
import { redirect } from 'next/navigation'
import { getDB } from '@/lib/db'
import { getAssignment } from '@/lib/assignments'
import type { Submission, Student } from '@/lib/db'
import GradeActions from './GradeActions'

type FullSubmission = Submission & { student_name: string; student_email: string }

const STATUS_CONFIG: Record<string, { label: string; className: string }> = {
  pending: { label: 'Pending Review', className: 'bg-sky-100 text-sky-700' },
  graded: { label: 'AI Graded', className: 'bg-violet-100 text-violet-700' },
  approved: { label: 'Approved', className: 'bg-emerald-100 text-emerald-700' },
  revision_requested: { label: 'Revision Requested', className: 'bg-orange-100 text-orange-700' },
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

  const db = getDB()

  const submissionsRaw = db
    .prepare(
      `SELECT s.*, st.name as student_name, st.email as student_email
       FROM submissions s
       JOIN students st ON st.id = s.student_id
       ORDER BY s.submitted_at DESC`
    )
    .all() as FullSubmission[]

  const submissions = filter
    ? submissionsRaw.filter((s) => s.status === filter)
    : submissionsRaw

  const counts = {
    all: submissionsRaw.length,
    pending: submissionsRaw.filter((s) => s.status === 'pending').length,
    graded: submissionsRaw.filter((s) => s.status === 'graded').length,
    approved: submissionsRaw.filter((s) => s.status === 'approved').length,
    revision_requested: submissionsRaw.filter((s) => s.status === 'revision_requested').length,
  }

  const FILTER_TABS = [
    { key: '', label: 'All', count: counts.all },
    { key: 'pending', label: 'Pending', count: counts.pending },
    { key: 'graded', label: 'AI Graded', count: counts.graded },
    { key: 'approved', label: 'Approved', count: counts.approved },
    { key: 'revision_requested', label: 'Revision Requested', count: counts.revision_requested },
  ]

  return (
    <div className="mx-auto w-full max-w-6xl px-4 py-8">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-stone-800">Instructor Portal</h1>
        <p className="mt-1 text-stone-500">
          Review student submissions, approve grades, or request revisions.
        </p>
      </div>

      {/* Stats row */}
      <div className="mb-6 grid grid-cols-2 gap-3 sm:grid-cols-4">
        <div className="rounded-xl border border-stone-200 bg-white p-4 text-center shadow-sm">
          <div className="text-2xl font-bold text-stone-800">{counts.all}</div>
          <div className="text-xs text-stone-500">Total submissions</div>
        </div>
        <div className="rounded-xl border border-sky-200 bg-sky-50 p-4 text-center">
          <div className="text-2xl font-bold text-sky-700">{counts.pending}</div>
          <div className="text-xs text-sky-600">Awaiting review</div>
        </div>
        <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-4 text-center">
          <div className="text-2xl font-bold text-emerald-700">{counts.approved}</div>
          <div className="text-xs text-emerald-600">Approved</div>
        </div>
        <div className="rounded-xl border border-orange-200 bg-orange-50 p-4 text-center">
          <div className="text-2xl font-bold text-orange-700">{counts.revision_requested}</div>
          <div className="text-xs text-orange-600">Needs revision</div>
        </div>
      </div>

      {/* Filter tabs */}
      <div className="mb-4 flex flex-wrap gap-2">
        {FILTER_TABS.map((tab) => (
          <a
            key={tab.key}
            href={tab.key ? `?filter=${tab.key}` : '/instructor'}
            className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-sm font-medium transition ${
              (filter ?? '') === tab.key
                ? 'border-amber-400 bg-amber-100 text-amber-800'
                : 'border-stone-200 bg-white text-stone-600 hover:border-amber-300 hover:bg-amber-50'
            }`}
          >
            {tab.label}
            <span className="rounded-full bg-stone-100 px-1.5 py-0.5 text-xs font-semibold text-stone-600">
              {tab.count}
            </span>
          </a>
        ))}
      </div>

      {/* Submission list */}
      {submissions.length === 0 ? (
        <div className="rounded-xl border border-dashed border-stone-300 bg-white p-12 text-center">
          <div className="mb-2 text-4xl">📭</div>
          <p className="text-stone-500">No submissions match this filter.</p>
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

            return (
              <div
                key={sub.id}
                className="rounded-xl border border-stone-200 bg-white p-5 shadow-sm"
              >
                <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                  <div className="flex-1">
                    {/* Header */}
                    <div className="mb-2 flex flex-wrap items-center gap-2">
                      <span
                        className={`rounded-full px-2.5 py-0.5 text-xs font-semibold ${statusCfg.className}`}
                      >
                        {statusCfg.label}
                      </span>
                      <span className="text-xs text-stone-400">Submitted {submittedDate}</span>
                      {sub.file_name && (
                        <span className="text-xs text-stone-400">📄 {sub.file_name}</span>
                      )}
                    </div>

                    {/* Student + Assignment */}
                    <h3 className="font-semibold text-stone-800">
                      {assignment.title}
                      <span className="ml-2 text-sm font-normal text-stone-400">
                        #{assignment.sequence}
                      </span>
                    </h3>
                    <p className="text-sm text-stone-500">
                      Student: <span className="font-medium text-stone-700">{sub.student_name}</span>
                      <span className="ml-2 text-stone-400">{sub.student_email}</span>
                    </p>

                    {/* Grade display */}
                    {displayGrade !== null && (
                      <p className="mt-1 text-sm text-stone-600">
                        {sub.instructor_grade !== null ? 'Instructor grade' : 'AI provisional grade'}:{' '}
                        <span className="font-bold text-stone-800">
                          {displayGrade}/{assignment.rubric.totalPoints}
                        </span>
                      </p>
                    )}

                    {/* AI feedback preview */}
                    {sub.ai_feedback && (
                      <div className="mt-2 rounded-lg bg-violet-50 p-2.5">
                        <div className="mb-1 text-xs font-semibold text-violet-600">AI Feedback</div>
                        <p className="line-clamp-3 text-xs text-stone-600">{sub.ai_feedback}</p>
                      </div>
                    )}

                    {/* Instructor notes */}
                    {sub.instructor_notes && (
                      <div className="mt-2 rounded-lg bg-stone-50 p-2.5">
                        <div className="mb-1 text-xs font-semibold text-stone-500">Your notes</div>
                        <p className="text-xs text-stone-600">{sub.instructor_notes}</p>
                      </div>
                    )}
                  </div>

                  {/* Action buttons */}
                  <div className="flex-shrink-0 sm:w-48">
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
