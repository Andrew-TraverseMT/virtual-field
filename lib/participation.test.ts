import assert from 'node:assert/strict'
import { describe, it } from 'node:test'
import { projectParticipationForInstructor } from './participation.ts'

describe('participation credit hides the path and consent', () => {
  it('gives the instructor the same record for surveys and the alternative', () => {
    const view = projectParticipationForInstructor([
      { studentId: 'user-aaa111', path: 'survey' },
      { studentId: 'user-bbb222', path: 'alternative' },
    ])
    const serialized = JSON.stringify(view)
    assert.deepEqual(view, [
      { studentId: 'user-aaa111', participationCredit: true },
      { studentId: 'user-bbb222', participationCredit: true },
    ])
    assert.equal(serialized.includes('survey'), false)
    assert.equal(serialized.includes('alternative'), false)
    assert.equal(serialized.includes('consent'), false)
    assert.equal(serialized.includes('grant'), false)
    assert.equal(serialized.includes('decline'), false)
  })
})