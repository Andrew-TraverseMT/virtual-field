import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth/next'
import { authOptions } from '@/lib/auth'
import {
  consentWriteDecision,
  hashReceipt,
  parseConsentEnvelope,
  readConfiguredConsentKey,
} from '@/lib/consent-crypto'
import { hasConsentReceipt, readGradesPosted, saveConsentCiphertext } from '@/lib/research'
import { sessionRole, sessionUserId } from '@/lib/session'

export async function GET(request: Request) {
  const session = await getServerSession(authOptions)
  if (sessionRole(session) !== 'student') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }
  if (!sessionUserId(session)) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const key = readConfiguredConsentKey()
  const gradesPosted = await readGradesPosted()
  const decision = consentWriteDecision(key, gradesPosted)
  const receipt = new URL(request.url).searchParams.get('receipt') ?? ''
  const receiptHash = hashReceipt(receipt)
  const submitted = receiptHash ? await hasConsentReceipt(receiptHash) : false
  return NextResponse.json({
    open: decision === 'ok',
    submitted,
  })
}

export async function POST(request: Request) {
  const session = await getServerSession(authOptions)
  if (sessionRole(session) !== 'student') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }
  if (!sessionUserId(session)) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const key = readConfiguredConsentKey()
  const gradesPosted = await readGradesPosted()
  const decision = consentWriteDecision(key, gradesPosted)
  if (decision === 'closed' || !key) {
    return NextResponse.json(
      { error: 'Consent collection is closed until a consent public key is configured.' },
      { status: 503 },
    )
  }
  if (decision === 'grades_posted') {
    return NextResponse.json({ error: 'Consent is closed because grades have been posted.' }, { status: 409 })
  }

  let body: unknown
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Invalid request.' }, { status: 400 })
  }
  const envelope = parseConsentEnvelope(body, key.kid)
  const receipt = body && typeof body === 'object' && !Array.isArray(body)
    ? (body as { receipt?: unknown }).receipt
    : null
  const receiptHash = typeof receipt === 'string' ? hashReceipt(receipt) : null
  if (!envelope || !receiptHash) {
    return NextResponse.json(
      { error: 'Submit an encrypted consent record. Plaintext decisions are not accepted.' },
      { status: 400 },
    )
  }

  const saved = await saveConsentCiphertext({ receiptHash, envelope })
  if (!saved.ok) return NextResponse.json({ error: saved.error }, { status: saved.status })
  return NextResponse.json({ ok: true })
}
