import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth/next'
import { authOptions } from '@/lib/auth'
import { readConsentEncryptionKey } from '@/lib/consent-crypto'
import { exportConsentBundle } from '@/lib/research'
import { blockIfPasswordChangeRequired, sessionRole, sessionUserId } from '@/lib/session'

export async function GET() {
  const session = await getServerSession(authOptions)
  const blocked = blockIfPasswordChangeRequired(session)
  if (blocked) return blocked
  const actorId = sessionUserId(session)
  if (!actorId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const key = readConsentEncryptionKey()
  if (!key) {
    return NextResponse.json(
      { error: 'Consent export is closed until CONSENT_ENCRYPTION_KEY is configured.' },
      { status: 503 },
    )
  }

  const result = await exportConsentBundle(sessionRole(session), actorId, key)
  if (!result.allowed) {
    return NextResponse.json(
      { error: 'The consent export is not available to this account.' },
      { status: 403 },
    )
  }

  const bundle = {
    note: 'Decrypted for the researcher account that downloaded this file. Store it outside the course database.',
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
