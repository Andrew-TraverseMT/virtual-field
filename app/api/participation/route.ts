import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth/next'
import { authOptions } from '@/lib/auth'
import { sql } from '@/lib/db'
import { saveParticipationAlternative } from '@/lib/research'
import { sessionRole, sessionUserId } from '@/lib/session'

export async function GET() {
  const session = await getServerSession(authOptions)
  if (sessionRole(session) !== 'student') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }
  const studentId = sessionUserId(session)
  if (!studentId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { rows: creditRows } = await sql`SELECT student_id FROM participation_credit WHERE student_id = ${studentId}`
  const { rows: altRows } = await sql`
    SELECT response FROM participation_alternative WHERE student_id = ${studentId}
  `
  const alternative = altRows[0] as { response?: string } | undefined
  return NextResponse.json({
    credited: creditRows.length > 0,
    alternative: alternative?.response ?? null,
  })
}

export async function POST(request: Request) {
  const session = await getServerSession(authOptions)
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
  const response = body && typeof body === 'object' && !Array.isArray(body)
    ? (body as { response?: unknown }).response
    : null
  if (typeof response !== 'string') {
    return NextResponse.json({ error: 'Write the reflection in the response field.' }, { status: 400 })
  }
  const saved = await saveParticipationAlternative(studentId, response)
  if (!saved.ok) return NextResponse.json({ error: saved.error }, { status: saved.status })
  return NextResponse.json({ ok: true })
}
