import { createCipheriv, createDecipheriv, createHmac, randomBytes } from 'crypto'
import type { AppRole } from '@/lib/study-access'

export const CONSENT_ALGORITHM = 'AES-256-GCM' as const

/** Columns stored for a consent record. The decision and identity stay inside ciphertext. */
export const CONSENT_RECORD_COLUMNS = ['id', 'receipt_hash', 'ciphertext', 'kid', 'created_at'] as const

export type ConsentEnvelope = {
  v: 1
  alg: typeof CONSENT_ALGORITHM
  iv: string
  tag: string
  ct: string
}

export function consentCollectionOpen(key: Buffer | null): boolean {
  return key !== null
}

export function consentWriteDecision(
  key: Buffer | null,
  gradesPosted: boolean,
): 'ok' | 'closed' | 'grades_posted' {
  if (!consentCollectionOpen(key)) return 'closed'
  if (gradesPosted) return 'grades_posted'
  return 'ok'
}

/** 32-byte key from CONSENT_ENCRYPTION_KEY (base64). Missing or wrong length fails closed. */
export function readConsentEncryptionKey(envValue: string | undefined = process.env.CONSENT_ENCRYPTION_KEY): Buffer | null {
  const raw = envValue?.trim()
  if (!raw) return null
  let decoded: Buffer
  try {
    decoded = Buffer.from(raw, 'base64')
  } catch {
    return null
  }
  if (decoded.length !== 32) return null
  return decoded
}

export function encryptConsentRecord(key: Buffer, payload: unknown): ConsentEnvelope {
  const iv = randomBytes(12)
  const cipher = createCipheriv('aes-256-gcm', key, iv)
  const ct = Buffer.concat([cipher.update(JSON.stringify(payload), 'utf8'), cipher.final()])
  const tag = cipher.getAuthTag()
  return {
    v: 1,
    alg: CONSENT_ALGORITHM,
    iv: iv.toString('base64'),
    tag: tag.toString('base64'),
    ct: ct.toString('base64'),
  }
}

export function decryptConsentRecord(key: Buffer, envelope: ConsentEnvelope): unknown {
  const decipher = createDecipheriv('aes-256-gcm', key, Buffer.from(envelope.iv, 'base64'))
  decipher.setAuthTag(Buffer.from(envelope.tag, 'base64'))
  const plain = Buffer.concat([
    decipher.update(Buffer.from(envelope.ct, 'base64')),
    decipher.final(),
  ])
  return JSON.parse(plain.toString('utf8')) as unknown
}

/** Plaintext is returned only to the researcher role, and only when the server key is configured. */
export function revealConsent(role: AppRole | null, key: Buffer | null, envelope: ConsentEnvelope): unknown | null {
  if (role !== 'researcher' || !key) return null
  return decryptConsentRecord(key, envelope)
}

export function consentReceiptHash(key: Buffer, studentId: string): string {
  return createHmac('sha256', key).update(`consent:${studentId}`).digest('hex')
}
