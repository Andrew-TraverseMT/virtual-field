import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { describe, it } from 'node:test'
import { seedCleanupPlan } from './legacy-accounts.ts'

describe('legacy accounts are untouched', () => {
  it('removes only the auto-created seed identity', () => {
    const lastYear = [
      { id: 'user-legacy-2025-a', email: 'student.one@montana.edu', name: 'Last Year One' },
      { id: 'user-legacy-2025-b', email: 'student.two@montana.edu', name: 'Last Year Two' },
    ]
    const accounts = [
      ...lastYear,
      { id: 'student-001', email: 'student@virtualfield.dev', name: 'Demo' },
      { id: 'student-001', email: 'real.person@montana.edu', name: 'Same id, real email' },
      { id: 'user-real', email: 'student@virtualfield.dev', name: 'Same email, real id' },
    ]
    const plan = seedCleanupPlan(accounts)

    assert.deepEqual(
      plan.remove.map((account) => account.name),
      ['Demo'],
    )
    assert.deepEqual(
      plan.keep.map((account) => account.id),
      ['user-legacy-2025-a', 'user-legacy-2025-b', 'student-001', 'user-real'],
    )
    assert.equal(plan.keep.some((account) => account.email === 'student.one@montana.edu'), true)
    assert.equal(plan.keep.some((account) => account.email === 'student.two@montana.edu'), true)
  })

  it('matches the seed delete to both id and email', () => {
    const source = readFileSync(new URL('./db.ts', import.meta.url), 'utf8')
    const start = source.indexOf('Remove the old demo student')
    const cleanup = source.slice(start)
    assert.equal(start > 0, true)
    assert.match(cleanup, /SEED_STUDENT_ID/)
    assert.match(cleanup, /SEED_STUDENT_EMAIL/)
    assert.equal(cleanup.includes('DELETE FROM registered_users'), false)
    assert.equal(cleanup.includes('UPDATE students'), false)
  })
})
