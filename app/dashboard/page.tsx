import { getServerSession } from 'next-auth/next'
import { authOptions } from '@/lib/auth'
import { redirect } from 'next/navigation'
import { getDB } from '@/lib/db'
import { assignments } from '@/lib/assignments'
import Link from 'next/link'

const UNIT_COLORS: Record<string, string> = {
  'Leeds Virtual Landscapes': 'bg-sky-100 text-sky-700',
  'Visible Geology': 'bg-violet-100 text-violet-700',
  'CYOA Final Project': 'bg-amber-100 text-amber-700',
}

const STATUS_CONFIG = {
  locked: {
    ring: 'border-stone-300 bg-stone-100',
    dot: 'bg-stone-300',
    label: 'Locked',
    labelClass: 'text-stone-400',
  },
  unlocked: {
    ring: 'border-amber-400 bg-amber-50',
    dot: 'bg-amber-400',
    label: 'Available',
    labelClass: 'text-amber-700 font-semibold',
  },
  pending: {
    ring: 'border-sky-400 bg-sky-50',
    dot: 'bg-sky-400',
    label: 'Submitted',
    labelClass: 'text-sky-700',
  },
  graded: {
    ring: 'border-violet-400 bg-violet-50',
    dot: 'bg-violet-400',
    label: 'AI Graded',
    labelClass: 'text-violet-700',
  },
  approved: {
    ring: 'border-emerald-400 bg-emerald-50',
    dot: 'bg-emerald-500',
    label: 'Approved ✓',
    labelClass: 'text-emerald-700 font-semibold',
  },
  revision_requested: {
    ring: 'border-orange-400 bg-orange-50',
    dot: 'bg-orange-400',
    label: 'Revision Requested',
    labelClass: 'text-orange-700',
  },
}

export default async function DashboardPage() {
  const session = await getServerSession(authOptions)
  if (!session) redirect('/login')

  const studentId = (session.user as { id?: string }).id ?? 'student-001'

  const db = getDB()
  const submissions = db
    .prepare(
      'SELECT assignment_id, status, ai_grade, instructor_grade FROM submissions WHERE student_id = ?'
    )
    .all(studentId) as Array<{
    assignment_id: string
    status: string
    ai_grade: number | null
    instructor_grade: number | null
  }>

  const student = db
    .prepare('SELECT enrolled_at, deadline_at FROM students WHERE id = ?')
    .get(studentId) as { enrolled_at: number; deadline_at: number } | undefined

  // Build submission map
  const subMap: Record<string, (typeof submissions)[number]> = {}
  for (const s of submissions) subMap[s.assignment_id] = s

  // Calculate per-assignment UI status
  type UIStatus = keyof typeof STATUS_CONFIG
  const rows = assignments.map((a, i) => {
    const sub = subMap[a.id]
    let uiStatus: UIStatus

    if (sub) {
      uiStatus = sub.status as UIStatus
    } else if (i === 0) {
      uiStatus = 'unlocked'
    } else {
      const prevId = assignments[i - 1].id
      uiStatus = subMap[prevId] ? 'unlocked' : 'locked'
    }

    return { assignment: a, uiStatus, sub: sub ?? null }
  })

  const now = Math.floor(Date.now() / 1000)
  const enrolledAt = student?.enrolled_at ?? now
  const deadlineAt = student?.deadline_at ?? now + 21 * 24 * 60 * 60
  const totalSecs = deadlineAt - enrolledAt
  const elapsedSecs = Math.max(0, now - enrolledAt)
  const progressPct = Math.min(100, Math.round((elapsedSecs / totalSecs) * 100))
  const daysRemaining = Math.max(0, Math.ceil((deadlineAt - now) / 86400))
  const daysElapsed = Math.min(21, Math.floor(elapsedSecs / 86400))

  const completedCount = submissions.filter((s) =>
    ['pending', 'graded', 'approved', 'revision_requested'].includes(s.status)
  ).length

  const totalPoints = assignments.reduce((sum, a) => sum + a.rubric.totalPoints, 0)

  // Group by week
  const byWeek = [1, 2, 3].map((w) => ({
    week: w,
    rows: rows.filter((r) => r.assignment.week === w),
  }))

  const WEEK_LABEL: Record<number, string> = {
    1: 'Week 1 — Leeds Virtual Landscapes: Fundamentals',
    2: 'Week 2 — Leeds Virtual Landscapes: Geological Mapping',
    3: 'Week 3 — Visible Geology & CYOA Final Project',
  }

  return (
    <div className="mx-auto w-full max-w-4xl px-4 py-8">
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-stone-800">
          Welcome back, {session.user?.name}
        </h1>
        <p className="mt-1 text-stone-500">
          Complete all assignments in order to finish the 3-week virtual field camp.
        </p>
      </div>

      {/* Progress bar */}
      <div className="mb-8 rounded-xl border border-stone-200 bg-white p-5 shadow-sm">
        <div className="mb-3 flex items-center justify-between text-sm">
          <span className="font-medium text-stone-700">
            {completedCount} / {assignments.length} assignments submitted
          </span>
          <span className={daysRemaining <= 3 ? 'font-semibold text-red-600' : 'text-stone-500'}>
            {daysRemaining > 0 ? `${daysRemaining} day${daysRemaining !== 1 ? 's' : ''} remaining` : 'Deadline reached'}
          </span>
        </div>

        {/* Camp timer */}
        <div className="mb-1 h-3 w-full overflow-hidden rounded-full bg-stone-100">
          <div
            className="h-3 rounded-full bg-amber-400 transition-all"
            style={{ width: `${progressPct}%` }}
          />
        </div>
        <div className="mt-1.5 flex justify-between text-xs text-stone-400">
          <span>Day {daysElapsed}</span>
          <span>Day 21</span>
        </div>

        {/* Stats row */}
        <div className="mt-4 grid grid-cols-3 gap-3 border-t border-stone-100 pt-4">
          <div className="text-center">
            <div className="text-xl font-bold text-stone-800">{completedCount}</div>
            <div className="text-xs text-stone-500">Submitted</div>
          </div>
          <div className="text-center">
            <div className="text-xl font-bold text-stone-800">
              {assignments.length - completedCount}
            </div>
            <div className="text-xs text-stone-500">Remaining</div>
          </div>
          <div className="text-center">
            <div className="text-xl font-bold text-stone-800">{totalPoints}</div>
            <div className="text-xs text-stone-500">Total points</div>
          </div>
        </div>
      </div>

      {/* Timeline grouped by week */}
      <div className="space-y-8">
        {byWeek.map(({ week, rows: weekRows }) => (
          <div key={week}>
            <h2 className="mb-3 text-xs font-semibold uppercase tracking-widest text-stone-400">
              {WEEK_LABEL[week]}
            </h2>

            <div className="relative">
              {/* Vertical connector line */}
              <div className="absolute left-5 top-6 bottom-6 w-0.5 bg-stone-200" />

              <div className="space-y-3">
                {weekRows.map(({ assignment: a, uiStatus, sub }) => {
                  const cfg = STATUS_CONFIG[uiStatus]
                  const isLocked = uiStatus === 'locked'
                  const displayGrade =
                    sub?.instructor_grade ?? sub?.ai_grade ?? null

                  return (
                    <div key={a.id} className="relative flex gap-4">
                      {/* Status dot */}
                      <div className="relative z-10 flex-shrink-0">
                        <div
                          className={`flex h-10 w-10 items-center justify-center rounded-full border-2 ${cfg.ring}`}
                        >
                          {uiStatus === 'approved' ? (
                            <svg className="h-5 w-5 text-emerald-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                              <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                            </svg>
                          ) : isLocked ? (
                            <svg className="h-4 w-4 text-stone-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                              <path strokeLinecap="round" strokeLinejoin="round" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                            </svg>
                          ) : (
                            <span className="text-sm font-bold text-stone-600">{a.sequence}</span>
                          )}
                        </div>
                      </div>

                      {/* Card */}
                      <div
                        className={`flex-1 rounded-xl border p-4 transition-shadow ${
                          isLocked
                            ? 'border-stone-200 bg-stone-50 opacity-60'
                            : 'border-stone-200 bg-white shadow-sm hover:shadow-md'
                        }`}
                      >
                        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                          <div className="min-w-0 flex-1">
                            <div className="mb-1 flex flex-wrap items-center gap-2">
                              <span
                                className={`inline-block rounded-full px-2 py-0.5 text-xs font-medium ${UNIT_COLORS[a.unit] ?? 'bg-stone-100 text-stone-600'}`}
                              >
                                {a.unit}
                              </span>
                              <span className={`text-xs ${cfg.labelClass}`}>
                                {cfg.label}
                              </span>
                              {displayGrade !== null && (
                                <span className="rounded-full bg-stone-100 px-2 py-0.5 text-xs font-medium text-stone-600">
                                  {displayGrade}/{a.rubric.totalPoints} pts
                                </span>
                              )}
                            </div>

                            <h3 className="font-semibold text-stone-800">{a.title}</h3>
                            <p className="mt-0.5 text-sm text-stone-500">{a.subtitle}</p>

                            <div className="mt-2 flex flex-wrap gap-3 text-xs text-stone-400">
                              <span>⏱ ~{a.estimatedHours} hr{a.estimatedHours !== 1 ? 's' : ''}</span>
                              <span>📊 {a.rubric.totalPoints} points</span>
                              <span>📋 {a.deliverables?.length ?? 0} deliverable{(a.deliverables?.length ?? 0) !== 1 ? 's' : ''}</span>
                            </div>
                          </div>

                          {!isLocked && (
                            <Link
                              href={`/assignments/${a.id}`}
                              className="flex-shrink-0 self-center rounded-lg bg-amber-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-amber-700"
                            >
                              {uiStatus === 'unlocked' ? 'Start →' : 'View →'}
                            </Link>
                          )}
                        </div>
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
