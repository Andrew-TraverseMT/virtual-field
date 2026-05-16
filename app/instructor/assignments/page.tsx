import { getServerSession } from 'next-auth/next'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { authOptions } from '@/lib/auth'
import { assignments } from '@/lib/assignments'
import { buildGradePrompt, buildFeedbackPrompt } from '@/lib/gemini'
import { AssignmentCard } from './AssignmentCard'

export default async function InstructorAssignmentsPage() {
  const session = await getServerSession(authOptions)
  if (!session || (session.user as { role?: string }).role !== 'instructor') {
    redirect('/login')
  }

  const weeks = [1, 2, 3]

  return (
    <div className="mx-auto w-full max-w-4xl px-4 sm:px-6 py-10">
      <div className="mb-8 flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-stone-900">Assignments</h1>
          <p className="mt-1 text-sm text-stone-400">
            Full assignment details and the exact prompts sent to the AI grading and feedback engine.
          </p>
        </div>
        <Link
          href="/instructor"
          className="text-sm text-stone-400 hover:text-stone-700 transition-colors whitespace-nowrap"
        >
          ← Submissions
        </Link>
      </div>

      <div className="space-y-10">
        {weeks.map((week) => {
          const weekAssignments = assignments.filter((a) => a.week === week)
          return (
            <section key={week}>
              <div className="mb-4 flex items-center gap-3">
                <span className="text-xs font-semibold uppercase tracking-widest text-stone-400">
                  Week {week}
                </span>
                <div className="flex-1 h-px bg-stone-100" />
              </div>
              <div className="space-y-3">
                {weekAssignments.map((a) => (
                  <AssignmentCard
                    key={a.id}
                    assignment={a}
                    gradePrompt={buildGradePrompt(a)}
                    feedbackPrompt={buildFeedbackPrompt(a)}
                  />
                ))}
              </div>
            </section>
          )
        })}
      </div>
    </div>
  )
}
