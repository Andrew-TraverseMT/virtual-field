import assert from 'node:assert/strict'
import { describe, it } from 'node:test'
import { researcherAccountAction } from './researcher-account.ts'

describe('researcher account creation', () => {
  it('creates a new account and reissues only an unused researcher password', () => {
    assert.equal(researcherAccountAction(null), 'create')
    assert.equal(
      researcherAccountAction({ role: 'researcher', mustChangePassword: true }),
      'reissue',
    )
    assert.equal(
      researcherAccountAction({ role: 'researcher', mustChangePassword: false }),
      'refuse',
    )
    assert.equal(
      researcherAccountAction({ role: 'instructor', mustChangePassword: true }),
      'refuse',
    )
    assert.equal(
      researcherAccountAction({ role: 'student', mustChangePassword: false }),
      'refuse',
    )
  })
})
