import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth/next'
import { authOptions } from '@/lib/auth'
import { sql } from '@/lib/db'
import { recordSurveyProgress, submitSurvey } from '@/lib/research'
import type { SurveyPhase } from '@/lib/surveys'
import { blockIfPasswordChangeRequired, sessionRole, sessionUserId } from '@/lib/session'

export async function POST(request: Request) {
  const session = await getServerSession(authOptions)
  const blocked = blockIfPasswordChangeRequired(session)
  if (blocked) return blocked
  if (sessionRole(session) !== 'student') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }
  const studentId = sessionUserId(session)
  if (!studentId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  let body: unknown
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Invalid request.' }, { status: 400 })
  }
  if (!body || typeof body !== 'object' || Array.isArray(body)) {
    return NextResponse.json({ error: 'Invalid request.' }, { status: 400 })
  }
  const record = body as Record<string, unknown>
  const banned = ['studentid', 'student_id', 'email', 'name', 'userid', 'user_id']
  if (Object.keys(record).some((key) => banned.includes(key.toLowerCase()))) {
    return NextResponse.json({ error: 'That field is not part of the survey.' }, { status: 400 })
  }
  if (record.phase !== 'pre' && record.phase !== 'mid' && record.phase !== 'post') {
    return NextResponse.json({ error: 'Unknown survey phase.' }, { status: 400 })
  }
  if (typeof record.exercise !== 'number' || !Number.isInteger(record.exercise)) {
    return NextResponse.json({ error: 'Unknown exercise.' }, { status: 400 })
  }

  const { rows } = await sql`SELECT enrolled_at, deadline_at FROM students WHERE id = ${studentId}`
  const student = rows[0] as { enrolled_at?: number; deadline_at?: number } | undefined
  if (!student || typeof student.enrolled_at !== 'number' || typeof student.deadline_at !== 'number') {
    return NextResponse.json({ error: 'This survey is not open yet.' }, { status: 403 })
  }

  const result = await submitSurvey({
    participantCode: typeof record.participantCode === 'string' ? record.participantCode : '',
    exercise: record.exercise,
    phase: record.phase as SurveyPhase,
    answers: record.answers,
    forbiddenCodes: [studentId, session?.user?.email ?? '', session?.user?.name ?? ''].filter(Boolean),
    now: Math.floor(Date.now() / 1000),
    enrolledAt: student.enrolled_at,
    deadlineAt: student.deadline_at,
  })
  if (!result.ok) return NextResponse.json({ error: result.error }, { status: result.status })
  await recordSurveyProgress(studentId, record.exercise, record.phase)
  return NextResponse.json({ ok: true })
}
