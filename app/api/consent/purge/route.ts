import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth/next'
import { authOptions } from '@/lib/auth'
import { purgeConsentRecords } from '@/lib/research'
import { sessionRole, sessionUserId } from '@/lib/session'

export async function POST() {
  const session = await getServerSession(authOptions)
  const actorId = sessionUserId(session)
  if (!actorId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const result = await purgeConsentRecords(sessionRole(session), actorId)
  if (!result.ok) return NextResponse.json({ error: result.error }, { status: result.status })
  return NextResponse.json({ ok: true, count: result.count })
}
