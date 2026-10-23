import assert from 'node:assert/strict'
import { describe, it } from 'node:test'
import { roleFromInstructorUi } from './account-roles.ts'

describe('instructor roster roles', () => {
  it('creates an instructor and refuses the researcher role', () => {
    assert.equal(roleFromInstructorUi(undefined), 'instructor')
    assert.equal(roleFromInstructorUi(''), 'instructor')
    assert.equal(roleFromInstructorUi('instructor'), 'instructor')
    assert.equal(roleFromInstructorUi('researcher'), null)
    assert.equal(roleFromInstructorUi('consent_holder'), null)
    assert.equal(roleFromInstructorUi('student'), null)
  })
})
