import assert from 'node:assert/strict'
import { describe, it } from 'node:test'
import {
  participationPoints,
  projectParticipationForInstructor,
  surveyParticipationComplete,
} from './participation.ts'

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

describe('participation credit amount', () => {
  it('is 1% of the combined course grade by default, rounded', () => {
    assert.equal(participationPoints(600, 1), 6)
    assert.equal(participationPoints(600, 0), 0)
    assert.equal(participationPoints(600, 100), 0)
  })

  it('requires pre, mid, and post on every exercise', () => {
    const exercises = [1, 2]
    const complete = [
      { exercise: 1, phase: 'pre' },
      { exercise: 1, phase: 'mid' },
      { exercise: 1, phase: 'post' },
      { exercise: 2, phase: 'pre' },
      { exercise: 2, phase: 'mid' },
      { exercise: 2, phase: 'post' },
    ]
    assert.equal(surveyParticipationComplete(exercises, complete), true)
    assert.equal(surveyParticipationComplete(exercises, complete.slice(0, 5)), false)
    assert.equal(surveyParticipationComplete([], complete), false)
  })
})