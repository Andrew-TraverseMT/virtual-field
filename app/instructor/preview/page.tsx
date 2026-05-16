import { getServerSession } from 'next-auth/next'
import { authOptions } from '@/lib/auth'
import { redirect } from 'next/navigation'
import { assignments } from '@/lib/assignments'
import Link from 'next/link'

const UNIT_COLORS: Record<string, string> = {
  'Leeds Virtual Landscapes': 'bg-sky-50 text-sky-700 ring-1 ring-sky-200',
  'Visible Geology': 'bg-violet-50 text-violet-700 ring-1 ring-violet-200',
  'CYOA Final Project': 'bg-amber-50 text-amber-700 ring-1 ring-amber-200',
}

const WEEK_LABEL: Record<number, string> = {
  1: 'Week 1 — Fundamentals',
  2: 'Week 2 — Geological Mapping',
  3: 'Week 3 — Modelling & Independent Project',
}

export default async function InstructorPreviewPage() {
  const session = await getServerSession(authOptions)
  if (!session) redirect('/login')
  if ((session.user as { role?: string })?.role !== 'instructor') redirect('/dashboard')

  const byWeek = [1, 2, 3].map((w) => ({
    week: w,
    items: assignments.filter((a) => a.week === w),
  }))

  return (
    <div className="mx-auto w-full max-w-4xl px-4 sm:px-6 py-10">
      <div className="mb-8">
        <p className="text-xs font-semibold uppercase tracking-widest text-stone-400 mb-1">Instructor Preview</p>
        <h1 className="text-2xl font-semibold tracking-tight text-stone-900">Student Assignment View</h1>
        <p className="mt-2 text-sm text-stone-500">
          All assignments are shown as available regardless of prior submissions. Click any to see exactly what a student sees.
        </p>
      </div>

      <div className="space-y-10">
        {byWeek.map(({ week, items }) => (
          <div key={week}>
            <div className="mb-4 flex items-center gap-3">
              <span className="flex h-6 w-6 items-center justify-center rounded-full bg-stone-800 text-xs font-bold text-white">
                {week}
              </span>
              <h2 className="text-xs font-semibold uppercase tracking-widest text-stone-400">
                {WEEK_LABEL[week]}
              </h2>
            </div>

            <div className="relative">
              <div className="absolute left-[19px] top-8 bottom-8 w-px bg-stone-200" />

              <div className="space-y-3">
                {items.map((a) => (
                  <Link
                    key={a.id}
                    href={`/instructor/preview/${a.id}`}
                    className="group relative flex items-center gap-4 rounded-2xl border border-amber-500 bg-amber-50 p-4 transition-all hover:shadow-md hover:border-amber-600"
                  >
                    {/* Status dot */}
                    <div className="relative z-10 flex h-10 w-10 shrink-0 items-center justify-center rounded-full border-2 border-amber-500 bg-amber-50">
                      <div className="h-2.5 w-2.5 rounded-full bg-amber-500" />
                    </div>

                    <div className="min-w-0 flex-1">
                      <div className="mb-0.5 flex flex-wrap items-center gap-1.5">
                        <span className={`rounded-full px-2 py-0.5 text-[11px] font-medium ${UNIT_COLORS[a.unit] ?? 'bg-stone-100 text-stone-600'}`}>
                          {a.unit}
                        </span>
                        <span className="text-xs text-amber-700 font-medium">Available</span>
                      </div>
                      <p className="font-medium text-stone-900 text-sm group-hover:text-amber-800 transition-colors">
                        {a.title}
                      </p>
                      <p className="text-xs text-stone-500 mt-0.5">{a.subtitle}</p>
                    </div>

                    <div className="shrink-0 text-right">
                      <div className="text-xs font-medium text-stone-500">{a.rubric.totalPoints} pts</div>
                      <div className="text-xs text-stone-400">~{a.estimatedHours}h</div>
                    </div>
                  </Link>
                ))}
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
