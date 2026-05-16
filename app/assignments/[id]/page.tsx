import { getServerSession } from 'next-auth/next'
import { authOptions } from '@/lib/auth'
import { notFound, redirect } from 'next/navigation'
import { sql } from '@/lib/db'
import { assignments, getAssignment } from '@/lib/assignments'
import type { Submission } from '@/lib/db'
import Link from 'next/link'
import SubmitPanel from './SubmitPanel'
import FeedbackPanel from './FeedbackPanel'

type Props = { params: Promise<{ id: string }> }

const UNIT_COLORS: Record<string, string> = {
  'Leeds Virtual Landscapes': 'bg-sky-50 text-sky-700 ring-1 ring-sky-200',
  'Visible Geology': 'bg-violet-50 text-violet-700 ring-1 ring-violet-200',
  'CYOA Final Project': 'bg-amber-50 text-amber-700 ring-1 ring-amber-200',
}

export default async function AssignmentPage({ params }: Props) {
  const { id } = await params
  const session = await getServerSession(authOptions)
  if (!session) redirect('/login')

  const assignment = getAssignment(id)
  if (!assignment) notFound()

  const studentId = (session.user as { id?: string }).id ?? 'student-001'

  // Check if this assignment is accessible
  let isLocked = false
  if (assignment.sequence > 1) {
    const prevAssignment = assignments.find((a) => a.sequence === assignment.sequence - 1)
    if (prevAssignment) {
      const { rows: prevRows } = await sql`SELECT id FROM submissions WHERE student_id = ${studentId} AND assignment_id = ${prevAssignment.id}`
      if (prevRows.length === 0) isLocked = true
    }
  }

  const { rows: subRows } = await sql`SELECT * FROM submissions WHERE student_id = ${studentId} AND assignment_id = ${id}`
  const sub = subRows[0] as Submission | undefined

  const prevAssignment =
    assignment.sequence > 1
      ? assignments.find((a) => a.sequence === assignment.sequence - 1)
      : null
  const nextAssignment = assignments.find((a) => a.sequence === assignment.sequence + 1)

  return (
    <div className="mx-auto w-full max-w-5xl px-4 sm:px-6 py-10">

      {/* Breadcrumb */}
      <nav className="mb-8 flex items-center gap-2 text-sm text-stone-400">
        <Link href="/dashboard" className="hover:text-stone-700 transition-colors">Dashboard</Link>
        <span>/</span>
        <span className={`rounded-full px-2 py-0.5 text-[11px] font-medium ${UNIT_COLORS[assignment.unit] ?? 'bg-stone-100 text-stone-600'}`}>
          {assignment.unit}
        </span>
        <span>/</span>
        <span className="truncate text-stone-600 font-medium">{assignment.title}</span>
      </nav>

      {/* Locked banner */}
      {isLocked && (
        <div className="mb-8 flex items-center gap-4 rounded-2xl border border-stone-200 bg-white p-5 shadow-sm">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-stone-100">
            <svg className="h-5 w-5 text-stone-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
            </svg>
          </div>
          <div>
            <p className="font-medium text-stone-700">Assignment locked</p>
            <p className="text-sm text-stone-500">
              Complete{' '}
              {prevAssignment && (
                <Link href={`/assignments/${prevAssignment.id}`} className="font-medium text-amber-700 underline underline-offset-2">
                  {prevAssignment.title}
                </Link>
              )}{' '}
              first to unlock this assignment.
            </p>
          </div>
        </div>
      )}

      {/* Header */}
      <div className="mb-8 rounded-2xl border border-stone-200 bg-white p-6 sm:p-8 shadow-sm">
        <div className="mb-4 flex flex-wrap items-center gap-2">
          <span className={`rounded-full px-2.5 py-0.5 text-[11px] font-medium ${UNIT_COLORS[assignment.unit] ?? 'bg-stone-100 text-stone-600'}`}>
            {assignment.unit}
          </span>
          <span className="text-[11px] text-stone-400 font-medium">
            {assignment.sequence} / {assignments.length}
          </span>
          <span className="text-[11px] text-stone-400">·</span>
          <span className="text-[11px] text-stone-400 font-medium">{assignment.rubric.totalPoints} pts</span>
          <span className="text-[11px] text-stone-400">·</span>
          <span className="text-[11px] text-stone-400 font-medium">~{assignment.estimatedHours}h</span>
        </div>

        <h1 className="mb-1.5 text-2xl font-semibold tracking-tight text-stone-900">{assignment.title}</h1>
        <p className="mb-4 text-base text-stone-400 font-medium">{assignment.subtitle}</p>
        <p className="text-sm leading-relaxed text-stone-600">{assignment.description}</p>
        {assignment.attribution && (
          <p className="mt-4 border-t border-stone-100 pt-3 text-[11px] leading-relaxed text-stone-400">
            <span className="font-semibold uppercase tracking-wide text-stone-300">Attribution </span>
            {assignment.attribution}
          </p>
        )}
      </div>

      <div className="grid gap-6 lg:grid-cols-5">
        {/* Left column */}
        <div className="space-y-5 lg:col-span-3">

          {/* Learning goals */}
          {assignment.learningGoals && assignment.learningGoals.length > 0 && (
            <div className="rounded-2xl border border-stone-200 bg-white p-6 shadow-sm">
              <h2 className="mb-4 text-xs font-semibold uppercase tracking-widest text-stone-400">Learning Goals</h2>
              <ul className="space-y-2.5">
                {assignment.learningGoals.map((goal, i) => (
                  <li key={i} className="flex gap-3 text-sm text-stone-600">
                    <span className="mt-0.5 shrink-0 h-1.5 w-1.5 rounded-full bg-amber-600 mt-1.5" />
                    <span>{goal}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Activity / Tool */}
          {(assignment.url || (assignment.downloads && assignment.downloads.length > 0)) && (
            <div className="rounded-2xl border border-stone-200 bg-white p-6 shadow-sm">
              <h2 className="mb-4 text-xs font-semibold uppercase tracking-widest text-stone-400">
                {assignment.type === 'virtual-landscape' ? 'Virtual Landscape' : 'Visible Geology Tool'}
              </h2>

              {/* Offline notice */}
              {assignment.urlOffline && (
                <div className="mb-4 flex items-start gap-3 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3">
                  <span className="mt-0.5 shrink-0 text-amber-600 text-base">⚠</span>
                  <div className="text-sm">
                    <p className="font-medium text-amber-800">Online version unavailable</p>
                    <p className="text-amber-700">The hosted version of this activity is currently offline. Download the desktop app below to complete the exercise.</p>
                  </div>
                </div>
              )}

              {/* Download buttons */}
              {assignment.downloads && assignment.downloads.length > 0 && (
                <div className="space-y-2 mb-3">
                  {assignment.downloads.map((dl) => (
                    <a
                      key={dl.platform}
                      href={dl.url}
                      download
                      className="flex items-center gap-3 rounded-xl border border-stone-200 px-4 py-3 text-sm font-medium text-stone-700 transition hover:border-sky-300 hover:bg-sky-50 group"
                    >
                      <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-sky-50 text-sky-700 group-hover:bg-sky-100 transition-colors text-base">
                        {dl.platform === 'windows' ? '⊞' : ''}
                      </span>
                      <div className="min-w-0">
                        <div className="font-medium text-stone-800">{dl.label}</div>
                        <div className="text-xs text-stone-400">Desktop app · ZIP archive</div>
                      </div>
                      <span className="text-xs text-stone-400 shrink-0 ml-auto">↓</span>
                    </a>
                  ))}
                  {assignment.downloads.some((dl) => dl.platform === 'mac') && (
                    <p className="text-xs text-stone-400 px-1">
                      Mac users: if macOS blocks the app, go to System Settings → Privacy &amp; Security and click &quot;Open Anyway&quot;.
                    </p>
                  )}
                </div>
              )}

              {/* Online link — only shown if not offline */}
              {assignment.url && !assignment.urlOffline && (
                <a
                  href={assignment.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-3 rounded-xl border border-stone-200 px-4 py-3 text-sm font-medium text-stone-700 transition hover:border-violet-300 hover:bg-violet-50 group"
                >
                  <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-violet-50 text-violet-700 group-hover:bg-violet-100 transition-colors text-base">↗</span>
                  <div className="min-w-0">
                    <div className="font-medium text-stone-800">Open Visible Geology</div>
                    <div className="text-xs text-stone-400 truncate">{assignment.url}</div>
                  </div>
                </a>
              )}

              {/* Pre-built model link — shown when a specific sharecode URL is provided */}
              {assignment.embedUrl?.includes('sharecode') && !assignment.urlOffline && (
                <a
                  href={assignment.embedUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="mt-2 flex items-center gap-3 rounded-xl border border-violet-200 bg-violet-50 px-4 py-3 text-sm font-medium text-violet-800 transition hover:border-violet-300 hover:bg-violet-100 group"
                >
                  <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-violet-100 text-violet-700 group-hover:bg-violet-200 transition-colors text-base">★</span>
                  <div className="min-w-0">
                    <div className="font-medium text-violet-900">Load prebuilt model</div>
                    <div className="text-xs text-violet-500">Opens the model referenced in the assignment</div>
                  </div>
                  <span className="text-xs text-violet-400 shrink-0 ml-auto">↗</span>
                </a>
              )}
            </div>
          )}

          {/* Materials */}
          {assignment.materials.length > 0 && (
            <div className="rounded-2xl border border-stone-200 bg-white p-6 shadow-sm">
              <h2 className="mb-4 text-xs font-semibold uppercase tracking-widest text-stone-400">Materials &amp; Files</h2>
              <ul className="space-y-2">
                {assignment.materials.map((filename) => (
                  <li key={filename}>
                    <a
                      href={`/api/materials/${encodeURIComponent(filename)}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-3 rounded-xl border border-stone-200 px-3.5 py-2.5 text-sm text-stone-700 transition hover:border-amber-300 hover:bg-amber-50"
                    >
                      <span className="text-stone-400 text-base shrink-0">{filename.endsWith('.pdf') ? '⬜' : '🖼'}</span>
                      <span className="flex-1 truncate font-medium">{filename}</span>
                      <span className="text-xs text-stone-400 shrink-0">↗</span>
                    </a>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* CYOA: Location options */}
          {assignment.locationOptions && assignment.locationOptions.length > 0 && (
            <div className="rounded-2xl border border-stone-200 bg-white p-6 shadow-sm">
              <h2 className="mb-1 text-xs font-semibold uppercase tracking-widest text-stone-400">Project Type Options</h2>
              <p className="mb-4 text-sm text-stone-500">
                Choose the option that best fits your interests. State your choice in the proposal.
              </p>
              <div className="space-y-3">
                {assignment.locationOptions.map((opt) => (
                  <div key={opt.id} className="rounded-xl border border-stone-200 p-4">
                    <div className="mb-1.5 flex flex-wrap items-center gap-2">
                      <span className="font-medium text-stone-800 text-sm">{opt.label}</span>
                      {opt.requiresStereonet && (
                        <span className="rounded-full bg-violet-50 px-2 py-0.5 text-[11px] font-medium text-violet-700 ring-1 ring-violet-200">
                          Stereonet required
                        </span>
                      )}
                    </div>
                    <p className="text-sm text-stone-500">{opt.description}</p>
                    <p className="mt-1.5 text-xs text-stone-400">
                      Hazard focus: {opt.hazardTheme}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* CYOA: Proposal sections */}
          {assignment.proposalSections && assignment.proposalSections.length > 0 && (
            <div className="rounded-2xl border border-stone-200 bg-white p-6 shadow-sm">
              <h2 className="mb-1 text-xs font-semibold uppercase tracking-widest text-stone-400">Required Proposal Sections</h2>
              <p className="mb-4 text-sm text-stone-500">Your proposal PDF must address all eight sections below.</p>
              <div className="space-y-3">
                {assignment.proposalSections.map((sec) => (
                  <div key={sec.id} className="flex gap-3 rounded-xl bg-stone-50 p-3.5">
                    <span className="shrink-0 text-xs font-bold text-amber-700 mt-0.5">
                      {sec.label.split('.')[0]}.
                    </span>
                    <div>
                      <div className="text-sm font-medium text-stone-700">
                        {sec.label.split('. ').slice(1).join('. ')}
                      </div>
                      <div className="text-sm text-stone-500 mt-0.5">{sec.description}</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Right column */}
        <div className="space-y-5 lg:col-span-2">

          {/* Deliverables */}
          {assignment.deliverables && assignment.deliverables.length > 0 && (
            <div className="rounded-2xl border border-stone-200 bg-white p-6 shadow-sm">
              <h2 className="mb-4 text-xs font-semibold uppercase tracking-widest text-stone-400">Deliverables</h2>
              <div className="space-y-3">
                {assignment.deliverables
                  .filter((d) => !d.conditional)
                  .map((d, i) => (
                  <div key={d.id} className="flex gap-3">
                    <div className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-stone-900 text-[10px] font-bold text-white">
                      {i + 1}
                    </div>
                    <div>
                      <div className="text-sm font-medium text-stone-800">{d.label}</div>
                      <div className="text-xs text-stone-400 mt-0.5">{d.description}</div>
                    </div>
                  </div>
                ))}
                {assignment.deliverables.filter((d) => d.conditional).map((d) => (
                  <div key={d.id} className="flex gap-3 rounded-xl border border-dashed border-violet-200 bg-violet-50/60 p-3">
                    <span className="shrink-0 text-xs text-violet-400 mt-0.5">✦</span>
                    <div>
                      <div className="text-sm font-medium text-violet-800">{d.label}</div>
                      <div className="text-xs text-violet-500 mt-0.5">{d.description}</div>
                      {d.condition && (
                        <div className="text-xs text-violet-400 mt-0.5 italic">Condition: {d.condition}</div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Rubric */}
          <div className="rounded-2xl border border-stone-200 bg-white p-6 shadow-sm">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-xs font-semibold uppercase tracking-widest text-stone-400">Rubric</h2>
              <span className="text-xs font-semibold text-stone-500">
                {assignment.rubric.totalPoints} pts
              </span>
            </div>
            <div className="space-y-2.5">
              {assignment.rubric.criteria.map((c) => (
                <div key={c.id} className="rounded-xl bg-stone-50 p-3.5">
                  <div className="mb-1 flex items-center justify-between gap-2">
                    <span className="text-sm font-medium text-stone-700">{c.label}</span>
                    <span className="shrink-0 text-sm font-bold text-amber-700">{c.points}</span>
                  </div>
                  <p className="text-xs text-stone-400 leading-relaxed">{c.description}</p>
                </div>
              ))}
            </div>
          </div>

          {/* Pre-submission feedback */}
          {!isLocked && <FeedbackPanel assignmentId={id} />}

          {/* Formal submission */}
          {!isLocked && (
            <SubmitPanel
              assignmentId={id}
              existingStatus={sub?.status ?? null}
              existingFileName={sub?.file_name ?? null}
              aiGrade={sub?.ai_grade ?? null}
              aiFeedback={sub?.ai_feedback ?? null}
              aiRubricScores={sub?.ai_rubric_scores ?? null}
              instructorGrade={sub?.instructor_grade ?? null}
              instructorNotes={sub?.instructor_notes ?? null}
              totalPoints={assignment.rubric.totalPoints}
            />
          )}
        </div>
      </div>

      {/* Navigation footer */}
      <div className="mt-12 flex items-center justify-between border-t border-stone-200 pt-6">
        {prevAssignment ? (
          <Link
            href={`/assignments/${prevAssignment.id}`}
            className="flex items-center gap-2 text-sm text-stone-400 hover:text-stone-700 transition-colors"
          >
            <span>←</span>
            <span className="hidden sm:inline">{prevAssignment.title}</span>
            <span className="sm:hidden">Previous</span>
          </Link>
        ) : <div />}

        <Link href="/dashboard" className="text-sm text-stone-400 hover:text-stone-700 transition-colors">
          ↑ Dashboard
        </Link>

        {nextAssignment ? (
          <Link
            href={`/assignments/${nextAssignment.id}`}
            className="flex items-center gap-2 text-sm text-stone-400 hover:text-stone-700 transition-colors"
          >
            <span className="hidden sm:inline">{nextAssignment.title}</span>
            <span className="sm:hidden">Next</span>
            <span>→</span>
          </Link>
        ) : <div />}
      </div>
    </div>
  )
}
