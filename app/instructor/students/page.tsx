import { getServerSession } from 'next-auth'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { authOptions } from '@/lib/auth'
import { getDB } from '@/lib/db'

interface StudentRow {
  id: string
  name: string
  email: string
  enrolled_at: number
  deadline_at: number | null
  submission_count: number
}

export default async function StudentsPage() {
  const session = await getServerSession(authOptions)
  const role = (session?.user as { role?: string } | undefined)?.role
  if (role !== 'instructor') redirect('/dashboard')

  const db = getDB()
  const students = db
    .prepare(
      `SELECT
         s.id,
         s.name,
         s.email,
         s.enrolled_at,
         s.deadline_at,
         COUNT(sub.id) AS submission_count
       FROM students s
       LEFT JOIN submissions sub ON sub.student_id = s.id
       GROUP BY s.id
       ORDER BY s.enrolled_at DESC`
    )
    .all() as StudentRow[]

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

        {students.length === 0 ? (
          <div className="rounded-2xl border border-stone-200 bg-white shadow-sm p-8 text-center">
            <p className="text-sm text-stone-400">No students enrolled yet.</p>
          </div>
        ) : (
          <div className="rounded-2xl border border-stone-200 bg-white shadow-sm overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-stone-100">
                  <th className="text-left px-5 py-3 text-xs font-semibold uppercase tracking-widest text-stone-400">
                    Name
                  </th>
                  <th className="text-left px-5 py-3 text-xs font-semibold uppercase tracking-widest text-stone-400">
                    Email
                  </th>
                  <th className="text-left px-5 py-3 text-xs font-semibold uppercase tracking-widest text-stone-400">
                    Enrolled
                  </th>
                  <th className="text-left px-5 py-3 text-xs font-semibold uppercase tracking-widest text-stone-400">
                    Deadline
                  </th>
                  <th className="text-right px-5 py-3 text-xs font-semibold uppercase tracking-widest text-stone-400">
                    Submissions
                  </th>
                </tr>
              </thead>
              <tbody>
                {students.map((student, i) => (
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
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </main>
  )
}
