import assert from 'node:assert/strict'
import { randomBytes } from 'node:crypto'
import { describe, it } from 'node:test'
import {
  CONSENT_RECORD_COLUMNS,
  consentCollectionOpen,
  consentWriteDecision,
  decryptConsentRecord,
  encryptConsentRecord,
  readConsentEncryptionKey,
  revealConsent,
} from './consent-crypto.ts'
import { canExportConsent, canPurgeConsent, canViewConsentList, canViewStudyData } from './study-access.ts'

function key(): Buffer {
  return randomBytes(32)
}

describe('consent encryption fails closed', () => {
  it('refuses collection when the server key is missing or the wrong length', () => {
    assert.equal(readConsentEncryptionKey(undefined), null)
    assert.equal(readConsentEncryptionKey(''), null)
    assert.equal(readConsentEncryptionKey(Buffer.alloc(16).toString('base64')), null)
    assert.equal(consentCollectionOpen(null), false)
    assert.equal(consentWriteDecision(null, false), 'closed')
    assert.equal(consentWriteDecision(null, true), 'closed')
    assert.equal(consentWriteDecision(key(), true), 'grades_posted')
    assert.equal(consentWriteDecision(key(), false), 'ok')
  })

  it('stores ciphertext only and reveals it to the researcher', () => {
    const secret = key()
    const payload = {
      decision: 'grant',
      participantCode: 'River-4242',
      name: 'Distinct Student Name',
      email: 'distinct.student@example.edu',
    }
    const envelope = encryptConsentRecord(secret, payload)
    const stored = JSON.stringify({
      id: 'row-1',
      receipt_hash: 'abc',
      ciphertext: JSON.stringify(envelope),
      kid: 'aes-256-gcm',
      created_at: 1,
    })

    assert.equal('decision' in envelope, false)
    assert.equal(stored.includes('Distinct Student Name'), false)
    assert.equal(stored.includes('distinct.student@example.edu'), false)
    assert.equal(stored.includes('River-4242'), false)
    assert.deepEqual(decryptConsentRecord(secret, envelope), payload)
    assert.equal(revealConsent('instructor', secret, envelope), null)
    assert.equal(revealConsent('student', secret, envelope), null)
    assert.equal(revealConsent('researcher', null, envelope), null)
    assert.deepEqual(revealConsent('researcher', secret, envelope), payload)
    assert.equal(
      CONSENT_RECORD_COLUMNS.some((column) =>
        ['name', 'email', 'decision', 'student_id', 'participant_code'].includes(column),
      ),
      false,
    )
  })

  it('accepts a 32-byte base64 key', () => {
    const secret = key()
    const read = readConsentEncryptionKey(secret.toString('base64'))
    assert.ok(read)
    assert.equal(read.length, 32)
  })
})

describe('researcher is the only role that can read study data', () => {
  it('blocks instructors and students from consent and study views', () => {
    assert.equal(canViewConsentList('researcher', false), true)
    assert.equal(canViewConsentList('researcher', true), false)
    assert.equal(canViewConsentList('instructor', false), false)
    assert.equal(canExportConsent('researcher', false), true)
    assert.equal(canExportConsent('instructor', false), false)
    assert.equal(canPurgeConsent('researcher'), true)
    assert.equal(canPurgeConsent('instructor'), false)
    assert.equal(canPurgeConsent('student'), false)
    assert.equal(canViewStudyData('researcher'), true)
    assert.equal(canViewStudyData('instructor'), false)
    assert.equal(canViewStudyData('student'), false)
  })
})
