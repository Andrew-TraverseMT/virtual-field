import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth/next'
import { authOptions } from '@/lib/auth'
import { CONSENT_ALGORITHM } from '@/lib/consent-crypto'
import { exportConsentBundle } from '@/lib/research'
import { sessionRole, sessionUserId } from '@/lib/session'

export async function GET() {
  const session = await getServerSession(authOptions)
  const role = sessionRole(session)
  const actorId = sessionUserId(session)
  if (!actorId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const result = await exportConsentBundle(role, actorId)
  if (!result.allowed) {
    return NextResponse.json(
      { error: 'The consent export is not available to this account.' },
      { status: 403 },
    )
  }

  const bundle = {
    note: 'Ciphertext only. Decrypt on the consent holder’s computer. The private key never belongs on this server.',
    algorithm: CONSENT_ALGORITHM,
    exportedAt: Math.floor(Date.now() / 1000),
    records: result.records,
  }
  return new NextResponse(JSON.stringify(bundle, null, 2), {
    status: 200,
    headers: {
      'content-type': 'application/json; charset=utf-8',
      'content-disposition': 'attachment; filename="consent-export.json"',
    },
  })
}
