import assert from 'node:assert/strict'
import { describe, it } from 'node:test'
import {
  TEMP_PASSWORD_TTL_SECONDS,
  generateTemporaryPassword,
  passwordMeetsStrength,
  temporaryPasswordExpired,
} from './passwords.ts'

describe('password strength', () => {
  it('requires 12 characters, mixed case, and a digit', () => {
    assert.equal(passwordMeetsStrength('short1A').ok, false)
    assert.equal(passwordMeetsStrength('alllowercase12').ok, false)
    assert.equal(passwordMeetsStrength('ALLUPPERCASE12').ok, false)
    assert.equal(passwordMeetsStrength('NoDigitsHere!').ok, false)
    assert.equal(passwordMeetsStrength('password1234').ok, false)
    assert.equal(passwordMeetsStrength('Instructor1234').ok, false)
    assert.equal(passwordMeetsStrength('FieldCamp-2026').ok, true)
  })

  it('expires an unused temporary password after 7 days', () => {
    const start = 1_700_000_000
    const expires = start + TEMP_PASSWORD_TTL_SECONDS
    assert.equal(TEMP_PASSWORD_TTL_SECONDS, 7 * 24 * 60 * 60)
    assert.equal(temporaryPasswordExpired(true, expires, expires - 1), false)
    assert.equal(temporaryPasswordExpired(true, expires, expires), true)
    assert.equal(temporaryPasswordExpired(false, expires, expires + 10), false)
    assert.equal(temporaryPasswordExpired(true, null, expires), false)
  })

  it('generates a strong temporary password without a fixed value', () => {
    const first = generateTemporaryPassword()
    const second = generateTemporaryPassword()
    assert.equal(passwordMeetsStrength(first).ok, true)
    assert.equal(passwordMeetsStrength(second).ok, true)
    assert.notEqual(first, second)
  })
})
