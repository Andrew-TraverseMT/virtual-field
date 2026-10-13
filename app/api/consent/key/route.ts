import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth/next'
import { authOptions } from '@/lib/auth'
import { readConfiguredConsentKey } from '@/lib/consent-crypto'
import { sessionRole } from '@/lib/session'

export async function GET() {
  const session = await getServerSession(authOptions)
  if (sessionRole(session) !== 'student') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }
  const key = readConfiguredConsentKey()
  if (!key) {
    return NextResponse.json(
      { error: 'Consent collection is closed until a consent public key is configured.' },
      { status: 503 },
    )
  }
  return NextResponse.json({
    kid: key.kid,
    jwk: key.jwk,
    alg: 'RSA-OAEP-256',
  })
}
