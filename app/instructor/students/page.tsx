import { getServerSession } from 'next-auth'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { authOptions } from '@/lib/auth'
import { sql } from '@/lib/db'
import { assignments } from '@/lib/assignments'
import { AddStudentForm, PasswordCell, DeleteStudentButton } from './StudentActions'

interface StudentRow {
  id: string
  name: string
  email: string
  enrolled_at: number
  deadline_at: number | null
  submission_count: number
  temp_password: string | null
}

interface SubmissionScoreRow {
  student_id: string
  assignment_id: string
  ai_grade: number | null
  instructor_grade: number | null
}

export default async function StudentsPage() {
  const session = await getServerSession(authOptions)
  const role = (session?.user as { role?: string } | undefined)?.role
  if (role !== 'instructor') redirect('/dashboard')

  const assignmentPointsById = new Map(
    assignments.map((assignment) => [assignment.id, assignment.rubric.totalPoints])
  )
  const totalPossiblePoints = assignments.reduce(
    (sum, assignment) => sum + assignment.rubric.totalPoints,
    0
  )

  const { rows: students } = await sql`
    SELECT
      s.id,
      s.name,
      s.email,
      s.enrolled_at,
      s.deadline_at,
      s.temp_password,
      COUNT(sub.id) AS submission_count
    FROM students s
    LEFT JOIN submissions sub ON sub.student_id = s.id
    GROUP BY s.id
    ORDER BY s.enrolled_at DESC
  ` as { rows: StudentRow[] }

  const { rows: submissionScores } = await sql`
    SELECT student_id, assignment_id, ai_grade, instructor_grade
    FROM submissions
  ` as { rows: SubmissionScoreRow[] }

  const scoreByStudentId = new Map<string, { earned: number; submittedPossible: number }>()
  for (const scoreRow of submissionScores) {
    const pointsForAssignment = assignmentPointsById.get(scoreRow.assignment_id)
    if (pointsForAssignment === undefined) continue

    const current = scoreByStudentId.get(scoreRow.student_id) ?? { earned: 0, submittedPossible: 0 }
    current.earned += scoreRow.instructor_grade ?? scoreRow.ai_grade ?? 0
    current.submittedPossible += pointsForAssignment
    scoreByStudentId.set(scoreRow.student_id, current)
  }

  function formatDate(ts: number | null) {
    if (!ts) return '—'
    return new Date(ts * 1000).toLocaleDateString('en-US', {
      month: 'short', day: 'numeric', year: 'numeric',
    })
  }

  return (
    <main className="min-h-screen px-4 py-12" style={{ backgroundColor: '#f8f7f4' }}>
      <div className="mx-auto max-w-4xl">
        <div className="mb-6">
          <Link href="/instructor"
            className="text-xs font-semibold uppercase tracking-widest text-stone-400 hover:text-amber-700">
            ← Instructor portal
          </Link>
        </div>

        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-stone-800">Student roster</h1>
            <p className="text-sm text-stone-500 mt-1">
              {students.length} student{students.length !== 1 ? 's' : ''} enrolled
            </p>
          </div>
        </div>

        <AddStudentForm />

        {students.length === 0 ? (
          <div className="rounded-2xl border border-stone-200 bg-white shadow-sm p-8 text-center">
            <p className="text-sm text-stone-400">No students enrolled yet.</p>
          </div>
        ) : (
          <div className="rounded-2xl border border-stone-200 bg-white shadow-sm overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full min-w-[1100px] text-sm">
                <thead>
                  <tr className="border-b border-stone-100">
                    <th className="text-left px-5 py-3 text-xs font-semibold uppercase tracking-widest text-stone-400 whitespace-nowrap">
                      Name
                    </th>
                    <th className="text-left px-5 py-3 text-xs font-semibold uppercase tracking-widest text-stone-400 whitespace-nowrap">
                      Email
                    </th>
                    <th className="text-left px-5 py-3 text-xs font-semibold uppercase tracking-widest text-stone-400 whitespace-nowrap">
                      Enrolled
                    </th>
                    <th className="text-left px-5 py-3 text-xs font-semibold uppercase tracking-widest text-stone-400 whitespace-nowrap">
                      Deadline
                    </th>
                    <th className="text-right px-5 py-3 text-xs font-semibold uppercase tracking-widest text-stone-400 whitespace-nowrap">
                      Submissions
                    </th>
                    <th className="text-right px-5 py-3 text-xs font-semibold uppercase tracking-widest text-stone-400 whitespace-nowrap">
                      Score (all)
                    </th>
                    <th className="text-right px-5 py-3 text-xs font-semibold uppercase tracking-widest text-stone-400 whitespace-nowrap">
                      Score (submitted)
                    </th>
                    <th className="text-left px-5 py-3 text-xs font-semibold uppercase tracking-widest text-stone-400 whitespace-nowrap">
                      Password
                    </th>
                    <th className="px-5 py-3" />
                  </tr>
                </thead>
                <tbody>
                  {students.map((student, i) => {
                    const studentScore = scoreByStudentId.get(student.id) ?? { earned: 0, submittedPossible: 0 }
                    const scoreAll = `${studentScore.earned}/${totalPossiblePoints}`
                    const scoreSubmitted = studentScore.submittedPossible > 0
                      ? `${studentScore.earned}/${studentScore.submittedPossible}`
                      : '—'

                    return (
                    <tr
                      key={student.id}
                      className={i < students.length - 1 ? 'border-b border-stone-100' : ''}
                    >
                      <td className="px-5 py-3 font-medium text-stone-800">{student.name}</td>
                      <td className="px-5 py-3 text-stone-500">{student.email}</td>
                      <td className="px-5 py-3 text-stone-500">{formatDate(student.enrolled_at)}</td>
                      <td className="px-5 py-3 text-stone-500">{formatDate(student.deadline_at)}</td>
                      <td className="px-5 py-3 text-right">
                        <span className="inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ring-1 ring-inset ring-stone-200 text-stone-600">
                          {student.submission_count}
                        </span>
                      </td>
                      <td className="px-5 py-3 text-right text-stone-600 font-medium tabular-nums whitespace-nowrap">{scoreAll}</td>
                      <td className="px-5 py-3 text-right text-stone-600 font-medium tabular-nums whitespace-nowrap">{scoreSubmitted}</td>
                      <td className="px-5 py-3">
                        <PasswordCell studentId={student.id} initialPassword={student.temp_password} />
                      </td>
                      <td className="px-5 py-3 whitespace-nowrap">
                        <DeleteStudentButton studentId={student.id} studentName={student.name} />
                      </td>
                    </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </main>
  )
}
