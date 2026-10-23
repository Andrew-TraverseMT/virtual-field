import { NextResponse } from 'next/server'
import { assignments } from '@/lib/assignments'
import { rateLimit } from '@/lib/rateLimit'
import { metricsEndpoint, studyVersion } from '@/lib/study'

function sameOrigin(request: Request): boolean {
  const host = request.headers.get('host')
  if (!host) return false

  const origin = request.headers.get('origin')
  if (origin) {
    try {
      return new URL(origin).host === host
    } catch {
      return false
    }
  }

  const referer = request.headers.get('referer')
  if (referer) {
    try {
      return new URL(referer).host === host
    } catch {
      return false
    }
  }

  return true
}

/**
 * Forwards one aggregate exercise-open event when metrics.endpoint is set.
 * With no endpoint configured, this returns immediately and makes no outbound call.
 * The forwarded body is event, exercise, and version. It does not read the session.
 */
export async function POST(request: Request) {
  const endpoint = metricsEndpoint()
  if (!endpoint) {
    return new NextResponse(null, { status: 204 })
  }

  if (!sameOrigin(request)) {
    return new NextResponse(null, { status: 204 })
  }

  const limit = rateLimit('usage-aggregate', 1000, 15 * 60 * 1000)
  if (!limit.ok) {
    return new NextResponse(null, { status: 204 })
  }

  let body: unknown
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Invalid usage event' }, { status: 400 })
  }

  if (!body || typeof body !== 'object' || Array.isArray(body)) {
    return NextResponse.json({ error: 'Invalid usage event' }, { status: 400 })
  }

  const record = body as Record<string, unknown>
  const keys = Object.keys(record)
  if (keys.length !== 1 || keys[0] !== 'exercise') {
    return NextResponse.json({ error: 'Invalid usage event' }, { status: 400 })
  }

  const exercise = record.exercise
  if (typeof exercise !== 'number' || !Number.isInteger(exercise)) {
    return NextResponse.json({ error: 'Invalid usage event' }, { status: 400 })
  }
  if (!assignments.some((assignment) => assignment.sequence === exercise)) {
    return NextResponse.json({ error: 'Invalid usage event' }, { status: 400 })
  }

  const payload: { event: 'exercise_open'; exercise: number; version?: string } = {
    event: 'exercise_open',
    exercise,
  }
  const version = studyVersion()
  if (version) payload.version = version

  try {
    await fetch(endpoint, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(payload),
      cache: 'no-store',
      redirect: 'error',
    })
  } catch {
    // A collector outage must not surface in the exercise.
  }

  return new NextResponse(null, {
    status: 204,
    headers: { 'cache-control': 'no-store' },
  })
}
