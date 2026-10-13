import assert from 'node:assert/strict'
import { generateKeyPairSync, webcrypto } from 'node:crypto'
import { describe, it } from 'node:test'
import {
  CONSENT_RECORD_COLUMNS,
  consentCollectionOpen,
  consentWriteDecision,
  decryptConsentPayload,
  describePublicKey,
  encryptConsentPayload,
  parseConsentEnvelope,
} from './consent-crypto.ts'
import { canExportConsent, canPurgeConsent, canViewConsentList } from './study-access.ts'

function keyPair() {
  return generateKeyPairSync('rsa', { modulusLength: 2048 })
}

describe('consent encryption fails closed', () => {
  it('refuses collection when the public key is missing', () => {
    assert.equal(consentCollectionOpen(null), false)
    assert.equal(consentWriteDecision(null, false), 'closed')
    assert.equal(consentWriteDecision(null, true), 'closed')
  })

  it('stores ciphertext only and round-trips with the private key', async () => {
    const { publicKey, privateKey } = keyPair()
    const pem = publicKey.export({ type: 'spki', format: 'pem' }).toString()
    const privatePem = privateKey.export({ type: 'pkcs8', format: 'pem' }).toString()
    const described = describePublicKey(pem)
    const payload = {
      decision: 'grant',
      participantCode: 'River-4242',
      name: 'Distinct Student Name',
      email: 'distinct.student@example.edu',
    }
    const envelope = encryptConsentPayload(pem, payload)
    const stored = JSON.stringify({
      id: 'row-1',
      receipt_hash: 'abc',
      ciphertext: JSON.stringify(envelope),
      kid: envelope.kid,
      created_at: 1,
    })

    assert.equal(envelope.kid, described.kid)
    assert.equal(stored.includes('Distinct Student Name'), false)
    assert.equal(stored.includes('distinct.student@example.edu'), false)
    assert.equal(stored.includes('grant'), false)
    assert.equal(stored.includes('River-4242'), false)
    assert.deepEqual(decryptConsentPayload(privatePem, envelope), payload)

    const browserKey = await webcrypto.subtle.importKey(
      'jwk',
      described.jwk,
      { name: 'RSA-OAEP', hash: 'SHA-256' },
      false,
      ['encrypt'],
    )
    const aes = await webcrypto.subtle.generateKey({ name: 'AES-GCM', length: 256 }, true, ['encrypt'])
    const rawAes = new Uint8Array(await webcrypto.subtle.exportKey('raw', aes))
    const ek = new Uint8Array(await webcrypto.subtle.encrypt({ name: 'RSA-OAEP' }, browserKey, rawAes))
    const iv = webcrypto.getRandomValues(new Uint8Array(12))
    const ct = new Uint8Array(
      await webcrypto.subtle.encrypt(
        { name: 'AES-GCM', iv },
        aes,
        new TextEncoder().encode(JSON.stringify(payload)),
      ),
    )
    const browserEnvelope = {
      v: 1 as const,
      alg: 'RSA-OAEP-256+A256GCM' as const,
      kid: described.kid,
      iv: Buffer.from(iv).toString('base64'),
      ek: Buffer.from(ek).toString('base64'),
      ct: Buffer.from(ct).toString('base64'),
    }
    assert.deepEqual(decryptConsentPayload(privatePem, browserEnvelope), payload)
    assert.equal(
      CONSENT_RECORD_COLUMNS.some((column) =>
        ['name', 'email', 'decision', 'student_id', 'participant_code'].includes(column),
      ),
      false,
    )
  })

  it('rejects a plaintext consent body', () => {
    const { publicKey } = keyPair()
    const pem = publicKey.export({ type: 'spki', format: 'pem' }).toString()
    const kid = describePublicKey(pem).kid
    const envelope = encryptConsentPayload(pem, { decision: 'decline' })
    assert.equal(parseConsentEnvelope({ decision: 'grant', envelope }, kid), null)
    assert.equal(parseConsentEnvelope({ email: 'a@b.edu', envelope }, kid), null)
    assert.deepEqual(parseConsentEnvelope({ envelope, receipt: 'aa' }, kid)?.kid, kid)
  })
})

describe('instructor cannot read consent', () => {
  it('blocks export and purge for the instructor', () => {
    assert.equal(canViewConsentList('instructor', false), false)
    assert.equal(canExportConsent('instructor', false), false)
    assert.equal(canExportConsent('consent_holder', false), true)
    assert.equal(canExportConsent('consent_holder', true), false)
    assert.equal(canPurgeConsent('instructor'), false)
    assert.equal(canPurgeConsent('student'), false)
    assert.equal(canPurgeConsent('consent_holder'), true)
  })
})
