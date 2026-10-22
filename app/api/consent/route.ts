import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth/next'
import { authOptions } from '@/lib/auth'
import {
  consentReceiptHash,
  consentWriteDecision,
  encryptConsentRecord,
  readConsentEncryptionKey,
} from '@/lib/consent-crypto'
import { hasConsentReceipt, readGradesPosted, saveConsentCiphertext } from '@/lib/research'
import { parseParticipantCode } from '@/lib/study-access'
import { blockIfPasswordChangeRequired, sessionRole, sessionUserId } from '@/lib/session'

export async function GET() {
  const session = await getServerSession(authOptions)
  const blocked = blockIfPasswordChangeRequired(session)
  if (blocked) return blocked
  if (sessionRole(session) !== 'student') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }
  const studentId = sessionUserId(session)
  if (!studentId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const key = readConsentEncryptionKey()
  const gradesPosted = await readGradesPosted()
  const decision = consentWriteDecision(key, gradesPosted)
  const submitted = key ? await hasConsentReceipt(consentReceiptHash(key, studentId)) : false
  return NextResponse.json({
    open: decision === 'ok',
    submitted,
  })
}

export async function POST(request: Request) {
  const session = await getServerSession(authOptions)
  const blocked = blockIfPasswordChangeRequired(session)
  if (blocked) return blocked
  if (sessionRole(session) !== 'student') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }
  const studentId = sessionUserId(session)
  if (!studentId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const key = readConsentEncryptionKey()
  const gradesPosted = await readGradesPosted()
  const decision = consentWriteDecision(key, gradesPosted)
  if (decision === 'closed' || !key) {
    return NextResponse.json(
      { error: 'Consent collection is closed until CONSENT_ENCRYPTION_KEY is configured.' },
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
  if (!body || typeof body !== 'object' || Array.isArray(body)) {
    return NextResponse.json({ error: 'Invalid request.' }, { status: 400 })
  }
  const record = body as Record<string, unknown>
  if (record.decision !== 'grant' && record.decision !== 'decline') {
    return NextResponse.json({ error: 'Choose grant or decline.' }, { status: 400 })
  }
  const forbidden = [studentId, session?.user?.email ?? '', session?.user?.name ?? ''].filter(
    (value): value is string => Boolean(value),
  )
  const code = parseParticipantCode(record.participantCode, forbidden)
  if (!code) {
    return NextResponse.json(
      { error: 'Use a linking code of 8–40 letters, numbers, or hyphens. Do not use your name, email, or account id.' },
      { status: 400 },
    )
  }

  const envelope = encryptConsentRecord(key, {
    decision: record.decision,
    participantCode: code,
    name: session?.user?.name ?? '',
    email: session?.user?.email ?? '',
    studentId,
    at: Math.floor(Date.now() / 1000),
  })
  const saved = await saveConsentCiphertext({
    receiptHash: consentReceiptHash(key, studentId),
    envelope,
  })
  if (!saved.ok) return NextResponse.json({ error: saved.error }, { status: saved.status })
  return NextResponse.json({ ok: true })
}
