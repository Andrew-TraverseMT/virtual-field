import { getServerSession } from 'next-auth/next'
import { authOptions } from '@/lib/auth'
import { redirect } from 'next/navigation'
import { sql } from '@/lib/db'
import { assignments } from '@/lib/assignments'
import Link from 'next/link'

const UNIT_COLORS: Record<string, string> = {
  'Leeds Virtual Landscapes': 'bg-sky-50 text-sky-700 ring-1 ring-sky-200',
  'Visible Geology': 'bg-violet-50 text-violet-700 ring-1 ring-violet-200',
  'CYOA Final Project': 'bg-amber-50 text-amber-700 ring-1 ring-amber-200',
}

const STATUS_CONFIG = {
  locked: {
    ring: 'border-stone-200 bg-stone-100',
    dot: 'bg-stone-300',
    label: 'Locked',
    labelClass: 'text-stone-400',
  },
  unlocked: {
    ring: 'border-amber-500 bg-amber-50',
    dot: 'bg-amber-500',
    label: 'Available',
    labelClass: 'text-amber-700 font-medium',
  },
  pending: {
    ring: 'border-sky-400 bg-sky-50',
    dot: 'bg-sky-400',
    label: 'Submitted',
    labelClass: 'text-sky-700',
  },
  ai_graded: {
    ring: 'border-violet-400 bg-violet-50',
    dot: 'bg-violet-400',
    label: 'Under Review',
    labelClass: 'text-violet-700',
  },
  graded: {
    ring: 'border-violet-400 bg-violet-50',
    dot: 'bg-violet-400',
    label: 'Graded',
    labelClass: 'text-violet-700',
  },
  approved: {
    ring: 'border-emerald-400 bg-emerald-50',
    dot: 'bg-emerald-500',
    label: 'Approved',
    labelClass: 'text-emerald-700 font-medium',
  },
  revision_requested: {
    ring: 'border-orange-400 bg-orange-50',
    dot: 'bg-orange-400',
    label: 'Revision Needed',
    labelClass: 'text-orange-700',
  },
}

export default async function DashboardPage() {
  const session = await getServerSession(authOptions)
  if (!session) redirect('/login')

  const studentId = (session.user as { id?: string }).id ?? 'student-001'

  const { rows: submissions } = await sql`
    SELECT assignment_id, status, ai_grade, instructor_grade FROM submissions WHERE student_id = ${studentId}
  ` as { rows: Array<{ assignment_id: string; status: string; ai_grade: number | null; instructor_grade: number | null }> }

  const { rows: studentRows } = await sql`SELECT enrolled_at, deadline_at FROM students WHERE id = ${studentId}`
  const student = studentRows[0] as { enrolled_at: number; deadline_at: number } | undefined

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

  // eslint-disable-next-line react-hooks/purity
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
    1: 'Week 1 — Fundamentals',
    2: 'Week 2 — Geological Mapping',
    3: 'Week 3 — Modelling & Independent Project',
  }

  return (
    <div className="mx-auto w-full max-w-4xl px-4 sm:px-6 py-10">

      {/* Page header */}
      <div className="mb-8">
        <p className="text-xs font-semibold uppercase tracking-widest text-stone-400 mb-1">Student Dashboard</p>
        <h1 className="text-2xl font-semibold tracking-tight text-stone-900">
          {session.user?.name}
        </h1>
      </div>

      {/* Progress card */}
      <div className="mb-10 rounded-2xl border border-stone-200 bg-white p-6 shadow-sm">

        {/* Top row */}
        <div className="mb-4 flex items-center justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-widest text-stone-400 mb-0.5">
              Field Camp Progress
            </p>
            <p className="text-sm text-stone-500">
              {completedCount} of {assignments.length} assignments submitted
            </p>
          </div>
          <span className={`text-sm font-medium tabular-nums ${daysRemaining <= 3 ? 'text-red-600 font-semibold' : 'text-stone-500'}`}>
            {daysRemaining > 0
              ? `${daysRemaining}d remaining`
              : 'Deadline reached'}
          </span>
        </div>

        {/* Progress bar */}
        <div className="mb-1 h-2 w-full overflow-hidden rounded-full bg-stone-100">
          <div
            className="h-2 rounded-full bg-amber-600 transition-all duration-500"
            style={{ width: `${progressPct}%` }}
          />
        </div>
        <div className="flex justify-between text-xs text-stone-400 mt-1.5">
          <span>Day {daysElapsed}</span>
          <span>Day 21</span>
        </div>

        {/* Stats */}
        <div className="mt-5 grid grid-cols-3 gap-4 border-t border-stone-100 pt-5">
          {[
            { label: 'Submitted', value: completedCount },
            { label: 'Remaining', value: assignments.length - completedCount },
            { label: 'Total Points', value: totalPoints },
          ].map(({ label, value }) => (
            <div key={label} className="text-center">
              <div className="text-2xl font-semibold text-stone-900 tabular-nums">{value}</div>
              <div className="text-xs text-stone-400 mt-0.5">{label}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Timeline grouped by week */}
      <div className="space-y-10">
        {byWeek.map(({ week, rows: weekRows }) => (
          <div key={week}>
            {/* Week heading */}
            <div className="mb-4 flex items-center gap-3">
              <span className="flex h-6 w-6 items-center justify-center rounded-full bg-stone-800 text-xs font-bold text-white">
                {week}
              </span>
              <h2 className="text-xs font-semibold uppercase tracking-widest text-stone-400">
                {WEEK_LABEL[week]}
              </h2>
            </div>

            <div className="relative">
              {/* Connector line */}
              <div className="absolute left-[19px] top-8 bottom-8 w-px bg-stone-200" />

              <div className="space-y-3">
                {weekRows.map(({ assignment: a, uiStatus, sub }) => {
                  const cfg = STATUS_CONFIG[uiStatus]
                  const isLocked = uiStatus === 'locked'
                  const isActive = uiStatus === 'unlocked'
                  const displayGrade = sub?.instructor_grade ?? sub?.ai_grade ?? null

                  return (
                    <div key={a.id} className="relative flex gap-4">
                      {/* Status indicator */}
                      <div className="relative z-10 shrink-0">
                        <div className={`flex h-10 w-10 items-center justify-center rounded-full border-2 ${cfg.ring}`}>
                          {uiStatus === 'approved' ? (
                            <svg className="h-4 w-4 text-emerald-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                              <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                            </svg>
                          ) : isLocked ? (
                            <svg className="h-3.5 w-3.5 text-stone-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                              <path strokeLinecap="round" strokeLinejoin="round" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                            </svg>
                          ) : (
                            <span className="text-xs font-bold text-stone-600">{a.sequence}</span>
                          )}
                        </div>
                      </div>

                      {/* Card */}
                      <div className={`flex-1 min-w-0 rounded-xl border p-4 transition-all ${
                        isLocked
                          ? 'border-stone-100 bg-stone-50/60 opacity-50'
                          : isActive
                          ? 'border-amber-200 bg-white shadow-sm ring-1 ring-amber-100'
                          : 'border-stone-200 bg-white shadow-sm hover:shadow-md'
                      }`}>
                        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                          <div className="min-w-0 flex-1">

                            {/* Badges row */}
                            <div className="mb-2 flex flex-wrap items-center gap-1.5">
                              <span className={`rounded-full px-2 py-0.5 text-[11px] font-medium ${UNIT_COLORS[a.unit] ?? 'bg-stone-100 text-stone-600'}`}>
                                {a.unit}
                              </span>
                              <span className={`text-xs ${cfg.labelClass}`}>
                                {cfg.label}
                              </span>
                              {displayGrade !== null && (uiStatus === 'approved' || uiStatus === 'graded') && (
                                <span className="rounded-full bg-stone-100 px-2 py-0.5 text-xs font-medium text-stone-600">
                                  {displayGrade}/{a.rubric.totalPoints} pts
                                </span>
                              )}
                            </div>

                            <h3 className="font-medium text-stone-900 leading-snug">{a.title}</h3>
                            <p className="mt-0.5 text-sm text-stone-400 leading-snug truncate">{a.subtitle}</p>

                            <div className="mt-2.5 flex flex-wrap gap-3 text-xs text-stone-400">
                              <span>~{a.estimatedHours}h</span>
                              <span>{a.rubric.totalPoints} pts</span>
                              <span>{a.deliverables?.length ?? 0} deliverable{(a.deliverables?.length ?? 0) !== 1 ? 's' : ''}</span>
                            </div>
                          </div>

                          {!isLocked && (
                            <Link
                              href={`/assignments/${a.id}`}
                              className={`shrink-0 self-start sm:self-center rounded-lg px-4 py-2 text-sm font-semibold transition-colors ${
                                isActive
                                  ? 'bg-amber-700 text-white hover:bg-amber-800'
                                  : 'bg-stone-100 text-stone-700 hover:bg-stone-200'
                              }`}
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
