import { getServerSession } from 'next-auth/next'
import { authOptions } from '@/lib/auth'
import { notFound, redirect } from 'next/navigation'
import { getDB } from '@/lib/db'
import { assignments, getAssignment } from '@/lib/assignments'
import type { Submission } from '@/lib/db'
import Link from 'next/link'
import SubmitPanel from './SubmitPanel'

type Props = { params: Promise<{ id: string }> }

const UNIT_COLORS: Record<string, string> = {
  'Leeds Virtual Landscapes': 'bg-sky-100 text-sky-700',
  'Visible Geology': 'bg-violet-100 text-violet-700',
  'CYOA Final Project': 'bg-amber-100 text-amber-700',
}

const TYPE_ICON: Record<string, string> = {
  'virtual-landscape': '🌄',
  'visible-geology': '🧊',
  'cyoa': '🗺️',
}

export default async function AssignmentPage({ params }: Props) {
  const { id } = await params
  const session = await getServerSession(authOptions)
  if (!session) redirect('/login')

  const assignment = getAssignment(id)
  if (!assignment) notFound()

  const studentId = (session.user as { id?: string }).id ?? 'student-001'
  const db = getDB()

  // Check if this assignment is accessible
  let isLocked = false
  if (assignment.sequence > 1) {
    const prevAssignment = assignments.find((a) => a.sequence === assignment.sequence - 1)
    if (prevAssignment) {
      const prevSub = db
        .prepare('SELECT id FROM submissions WHERE student_id = ? AND assignment_id = ?')
        .get(studentId, prevAssignment.id)
      if (!prevSub) isLocked = true
    }
  }

  const sub = db
    .prepare('SELECT * FROM submissions WHERE student_id = ? AND assignment_id = ?')
    .get(studentId, id) as Submission | undefined

  const prevAssignment =
    assignment.sequence > 1
      ? assignments.find((a) => a.sequence === assignment.sequence - 1)
      : null
  const nextAssignment = assignments.find((a) => a.sequence === assignment.sequence + 1)

  return (
    <div className="mx-auto w-full max-w-5xl px-4 py-8">
      {/* Breadcrumb */}
      <nav className="mb-6 flex items-center gap-2 text-sm text-stone-500">
        <Link href="/dashboard" className="hover:text-stone-800">Dashboard</Link>
        <span>›</span>
        <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${UNIT_COLORS[assignment.unit] ?? 'bg-stone-100 text-stone-600'}`}>
          {assignment.unit}
        </span>
        <span>›</span>
        <span className="truncate text-stone-700">{assignment.title}</span>
      </nav>

      {/* Locked banner */}
      {isLocked && (
        <div className="mb-6 flex items-center gap-3 rounded-xl border border-stone-200 bg-stone-50 p-4">
          <span className="text-2xl">🔒</span>
          <div>
            <p className="font-medium text-stone-700">This assignment is locked</p>
            <p className="text-sm text-stone-500">
              Complete{' '}
              {prevAssignment && (
                <Link href={`/assignments/${prevAssignment.id}`} className="font-medium text-amber-700 underline">
                  {prevAssignment.title}
                </Link>
              )}{' '}
              first to unlock this assignment.
            </p>
          </div>
        </div>
      )}

      {/* Header card */}
      <div className="mb-6 rounded-xl border border-stone-200 bg-white p-6 shadow-sm">
        <div className="mb-3 flex flex-wrap items-center gap-2">
          <span className="text-2xl">{TYPE_ICON[assignment.type]}</span>
          <span
            className={`rounded-full px-2.5 py-0.5 text-xs font-semibold ${UNIT_COLORS[assignment.unit] ?? 'bg-stone-100 text-stone-600'}`}
          >
            {assignment.unit}
          </span>
          <span className="rounded-full bg-stone-100 px-2.5 py-0.5 text-xs font-medium text-stone-600">
            Assignment {assignment.sequence} of {assignments.length}
          </span>
          <span className="rounded-full bg-stone-100 px-2.5 py-0.5 text-xs font-medium text-stone-600">
            {assignment.rubric.totalPoints} points
          </span>
          <span className="rounded-full bg-stone-100 px-2.5 py-0.5 text-xs font-medium text-stone-600">
            ~{assignment.estimatedHours} hr{assignment.estimatedHours !== 1 ? 's' : ''}
          </span>
        </div>

        <h1 className="mb-1 text-2xl font-bold text-stone-900">{assignment.title}</h1>
        <p className="mb-4 text-base text-stone-500">{assignment.subtitle}</p>
        <p className="text-sm leading-relaxed text-stone-600">{assignment.description}</p>
      </div>

      <div className="grid gap-6 lg:grid-cols-5">
        {/* Left column — content */}
        <div className="space-y-6 lg:col-span-3">

          {/* Learning goals */}
          {assignment.learningGoals && assignment.learningGoals.length > 0 && (
            <div className="rounded-xl border border-stone-200 bg-white p-5 shadow-sm">
              <h2 className="mb-3 font-semibold text-stone-700">Learning Goals</h2>
              <ul className="space-y-2">
                {assignment.learningGoals.map((goal, i) => (
                  <li key={i} className="flex gap-2 text-sm text-stone-600">
                    <span className="mt-0.5 flex-shrink-0 text-amber-500">◆</span>
                    <span>{goal}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Activity / Tool */}
          {assignment.url && (
            <div className="rounded-xl border border-stone-200 bg-white p-5 shadow-sm">
              <h2 className="mb-3 font-semibold text-stone-700">
                {assignment.type === 'virtual-landscape' ? 'Virtual Landscape Tool' : 'Visible Geology Tool'}
              </h2>

              {assignment.canEmbed && assignment.embedUrl ? (
                <div className="overflow-hidden rounded-lg border border-stone-200">
                  <iframe
                    src={assignment.embedUrl}
                    className="h-96 w-full"
                    title={assignment.title}
                    sandbox="allow-scripts allow-same-origin allow-forms allow-popups"
                  />
                </div>
              ) : null}

              <a
                href={assignment.url}
                target="_blank"
                rel="noopener noreferrer"
                className={`${assignment.canEmbed ? 'mt-3 ' : ''}flex items-center justify-center gap-2 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm font-semibold text-amber-800 transition hover:bg-amber-100`}
              >
                <span>🚀</span>
                <span>Open{assignment.canEmbed ? ' in new tab' : ' Activity'}</span>
                <span className="ml-auto text-xs font-normal opacity-60">{assignment.url}</span>
              </a>
            </div>
          )}

          {/* Materials */}
          {assignment.materials.length > 0 && (
            <div className="rounded-xl border border-stone-200 bg-white p-5 shadow-sm">
              <h2 className="mb-3 font-semibold text-stone-700">Materials &amp; Reference Files</h2>
              <ul className="space-y-2">
                {assignment.materials.map((filename) => (
                  <li key={filename}>
                    <a
                      href={`/api/materials/${encodeURIComponent(filename)}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-2 rounded-lg border border-stone-200 px-3 py-2.5 text-sm text-stone-700 transition hover:border-amber-300 hover:bg-amber-50"
                    >
                      <span className="text-base">{filename.endsWith('.pdf') ? '📄' : '🖼️'}</span>
                      <span className="flex-1 truncate">{filename}</span>
                      <span className="text-xs text-stone-400">Open ↗</span>
                    </a>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* CYOA-specific: Location options */}
          {assignment.locationOptions && assignment.locationOptions.length > 0 && (
            <div className="rounded-xl border border-stone-200 bg-white p-5 shadow-sm">
              <h2 className="mb-1 font-semibold text-stone-700">Project Type Options</h2>
              <p className="mb-4 text-sm text-stone-500">
                Choose the project type that best fits your interests. State your choice in the proposal.
              </p>
              <div className="space-y-3">
                {assignment.locationOptions.map((opt) => (
                  <div key={opt.id} className="rounded-lg border border-stone-200 p-3">
                    <div className="mb-1 flex items-center gap-2">
                      <span className="font-medium text-stone-800">{opt.label}</span>
                      {opt.requiresStereonet && (
                        <span className="rounded-full bg-violet-100 px-2 py-0.5 text-xs text-violet-700">
                          Stereonet required
                        </span>
                      )}
                    </div>
                    <p className="text-sm text-stone-600">{opt.description}</p>
                    <p className="mt-1 text-xs text-stone-400">
                      <span className="font-medium">Hazard theme:</span> {opt.hazardTheme}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* CYOA proposal sections */}
          {assignment.proposalSections && assignment.proposalSections.length > 0 && (
            <div className="rounded-xl border border-stone-200 bg-white p-5 shadow-sm">
              <h2 className="mb-1 font-semibold text-stone-700">Required Proposal Sections</h2>
              <p className="mb-4 text-sm text-stone-500">
                Your proposal PDF must address all eight sections below.
              </p>
              <div className="space-y-3">
                {assignment.proposalSections.map((sec) => (
                  <div key={sec.id} className="flex gap-3 rounded-lg bg-stone-50 p-3">
                    <span className="mt-0.5 flex-shrink-0 text-sm font-semibold text-amber-600">
                      {sec.label.split('.')[0]}.
                    </span>
                    <div>
                      <div className="text-sm font-medium text-stone-700">
                        {sec.label.split('. ').slice(1).join('. ')}
                      </div>
                      <div className="text-sm text-stone-500">{sec.description}</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Right column — deliverables, rubric, submission */}
        <div className="space-y-6 lg:col-span-2">

          {/* Deliverables */}
          {assignment.deliverables && assignment.deliverables.length > 0 && (
            <div className="rounded-xl border border-stone-200 bg-white p-5 shadow-sm">
              <h2 className="mb-3 font-semibold text-stone-700">Deliverables</h2>
              <div className="space-y-3">
                {assignment.deliverables
                  .filter((d) => !d.conditional)
                  .map((d, i) => (
                  <div key={d.id} className="flex gap-3">
                    <div className="mt-0.5 flex h-5 w-5 flex-shrink-0 items-center justify-center rounded-full bg-amber-100 text-xs font-bold text-amber-700">
                      {i + 1}
                    </div>
                    <div>
                      <div className="text-sm font-medium text-stone-800">{d.label}</div>
                      <div className="text-xs text-stone-500">{d.description}</div>
                    </div>
                  </div>
                ))}
                {assignment.deliverables.filter((d) => d.conditional).map((d) => (
                  <div key={d.id} className="flex gap-3 rounded-lg border border-dashed border-violet-200 bg-violet-50 p-2.5">
                    <span className="mt-0.5 flex-shrink-0 text-sm">✦</span>
                    <div>
                      <div className="text-sm font-medium text-violet-800">{d.label}</div>
                      <div className="text-xs text-violet-600">{d.description}</div>
                      {d.condition && (
                        <div className="mt-0.5 text-xs text-violet-400">Condition: {d.condition}</div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Rubric */}
          <div className="rounded-xl border border-stone-200 bg-white p-5 shadow-sm">
            <div className="mb-3 flex items-center justify-between">
              <h2 className="font-semibold text-stone-700">Grading Rubric</h2>
              <span className="rounded-full bg-stone-100 px-2.5 py-0.5 text-xs font-medium text-stone-600">
                {assignment.rubric.totalPoints} pts total
              </span>
            </div>
            <div className="space-y-2.5">
              {assignment.rubric.criteria.map((c) => (
                <div key={c.id} className="rounded-lg bg-stone-50 p-3">
                  <div className="mb-1 flex items-center justify-between">
                    <span className="text-sm font-medium text-stone-700">{c.label}</span>
                    <span className="text-sm font-bold text-amber-700">{c.points} pts</span>
                  </div>
                  <p className="text-xs text-stone-500">{c.description}</p>
                </div>
              ))}
            </div>
          </div>

          {/* Submission panel */}
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
      <div className="mt-10 flex items-center justify-between border-t border-stone-200 pt-6">
        {prevAssignment ? (
          <Link
            href={`/assignments/${prevAssignment.id}`}
            className="flex items-center gap-2 text-sm font-medium text-stone-500 hover:text-stone-800"
          >
            <span>←</span>
            <span className="hidden sm:inline">{prevAssignment.title}</span>
            <span className="sm:hidden">Previous</span>
          </Link>
        ) : <div />}

        <Link href="/dashboard" className="text-sm text-stone-400 hover:text-stone-700">
          Back to Dashboard
        </Link>

        {nextAssignment ? (
          <Link
            href={`/assignments/${nextAssignment.id}`}
            className="flex items-center gap-2 text-sm font-medium text-stone-500 hover:text-stone-800"
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
