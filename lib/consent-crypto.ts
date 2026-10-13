import {
  constants,
  createCipheriv,
  createDecipheriv,
  createHash,
  createPrivateKey,
  createPublicKey,
  privateDecrypt,
  publicEncrypt,
  randomBytes,
} from 'crypto'

export const CONSENT_ALGORITHM = 'RSA-OAEP-256+A256GCM' as const

/** Columns stored for a consent record. Identity and the decision stay inside ciphertext. */
export const CONSENT_RECORD_COLUMNS = ['id', 'receipt_hash', 'ciphertext', 'kid', 'created_at'] as const

const PLAINTEXT_BODY_KEYS = new Set([
  'decision',
  'participantcode',
  'participant_code',
  'email',
  'name',
  'studentid',
  'student_id',
  'userid',
  'user_id',
])

export type ConsentEnvelope = {
  v: 1
  alg: typeof CONSENT_ALGORITHM
  kid: string
  iv: string
  ek: string
  ct: string
}

export type ConsentPublicKey = {
  kid: string
  pem: string
  jwk: JsonWebKey
}

export function consentCollectionOpen(key: ConsentPublicKey | null): boolean {
  return key !== null
}

export function consentWriteDecision(
  key: ConsentPublicKey | null,
  gradesPosted: boolean,
): 'ok' | 'closed' | 'grades_posted' {
  if (!consentCollectionOpen(key)) return 'closed'
  if (gradesPosted) return 'grades_posted'
  return 'ok'
}

export function readConfiguredConsentKey(): ConsentPublicKey | null {
  const raw = process.env.CONSENT_PUBLIC_KEY?.trim()
  if (!raw) return null
  const pem = raw.includes('\\n') ? raw.replace(/\\n/g, '\n') : raw
  try {
    return describePublicKey(pem)
  } catch {
    return null
  }
}

export function describePublicKey(pem: string): ConsentPublicKey {
  const key = createPublicKey(pem)
  if (key.asymmetricKeyType !== 'rsa') {
    throw new Error('Consent public key must be RSA.')
  }
  const modulusLength = key.asymmetricKeyDetails?.modulusLength ?? 0
  if (modulusLength < 2048) {
    throw new Error('Consent public key must be at least 2048 bits.')
  }
  const spki = key.export({ type: 'spki', format: 'der' })
  const kid = createHash('sha256').update(spki).digest('hex')
  const jwk = key.export({ format: 'jwk' }) as JsonWebKey
  const exported = key.export({ type: 'spki', format: 'pem' })
  return { kid, pem: typeof exported === 'string' ? exported : exported.toString(), jwk }
}

function decodeBase64(value: string): Buffer | null {
  if (!/^[A-Za-z0-9+/]+={0,2}$/.test(value) || value.length % 4 !== 0) return null
  const buffer = Buffer.from(value, 'base64')
  if (buffer.length === 0) return null
  return buffer
}

export function parseConsentEnvelope(body: unknown, expectedKid: string): ConsentEnvelope | null {
  if (!body || typeof body !== 'object' || Array.isArray(body)) return null
  const record = body as Record<string, unknown>
  for (const key of Object.keys(record)) {
    if (PLAINTEXT_BODY_KEYS.has(key.toLowerCase())) return null
  }
  const envelope = record.envelope
  if (!envelope || typeof envelope !== 'object' || Array.isArray(envelope)) return null
  const env = envelope as Record<string, unknown>
  if (env.v !== 1 || env.alg !== CONSENT_ALGORITHM || env.kid !== expectedKid) return null
  if (typeof env.iv !== 'string' || typeof env.ek !== 'string' || typeof env.ct !== 'string') return null
  const iv = decodeBase64(env.iv)
  const ek = decodeBase64(env.ek)
  const ct = decodeBase64(env.ct)
  if (!iv || !ek || !ct) return null
  if (iv.length !== 12 || ek.length < 256 || ct.length <= 16) return null
  return { v: 1, alg: CONSENT_ALGORITHM, kid: expectedKid, iv: env.iv, ek: env.ek, ct: env.ct }
}

export function hashReceipt(receipt: string): string | null {
  if (!/^[a-f0-9]{32,128}$/i.test(receipt)) return null
  return createHash('sha256').update(receipt.toLowerCase()).digest('hex')
}

export function encryptConsentPayload(pem: string, payload: unknown): ConsentEnvelope {
  const { kid } = describePublicKey(pem)
  const key = createPublicKey(pem)
  const aes = randomBytes(32)
  const iv = randomBytes(12)
  const cipher = createCipheriv('aes-256-gcm', aes, iv)
  const data = Buffer.from(JSON.stringify(payload), 'utf8')
  const ct = Buffer.concat([cipher.update(data), cipher.final(), cipher.getAuthTag()])
  const ek = publicEncrypt(
    { key, padding: constants.RSA_PKCS1_OAEP_PADDING, oaepHash: 'sha256' },
    aes,
  )
  return {
    v: 1,
    alg: CONSENT_ALGORITHM,
    kid,
    iv: iv.toString('base64'),
    ek: ek.toString('base64'),
    ct: ct.toString('base64'),
  }
}

export function decryptConsentPayload(privatePem: string, envelope: ConsentEnvelope): unknown {
  const iv = Buffer.from(envelope.iv, 'base64')
  const ek = Buffer.from(envelope.ek, 'base64')
  const packed = Buffer.from(envelope.ct, 'base64')
  const tag = packed.subarray(packed.length - 16)
  const ct = packed.subarray(0, packed.length - 16)
  const aes = privateDecrypt(
    {
      key: createPrivateKey(privatePem),
      padding: constants.RSA_PKCS1_OAEP_PADDING,
      oaepHash: 'sha256',
    },
    ek,
  )
  const decipher = createDecipheriv('aes-256-gcm', aes, iv)
  decipher.setAuthTag(tag)
  const plain = Buffer.concat([decipher.update(ct), decipher.final()])
  return JSON.parse(plain.toString('utf8')) as unknown
}
