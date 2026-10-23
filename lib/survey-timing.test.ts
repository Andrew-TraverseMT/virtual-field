import assert from 'node:assert/strict'
import { describe, it } from 'node:test'
import { isExercisePhaseOpen, type DatedExercise } from './survey-timing.ts'

const DAY = 24 * 60 * 60
const enrolledAt = 1_700_000_000
const deadlineAt = enrolledAt + 21 * DAY

const cohort: DatedExercise[] = [
  { sequence: 1, week: 1 },
  { sequence: 2, week: 1 },
  { sequence: 3, week: 1 },
  { sequence: 4, week: 1 },
  { sequence: 5, week: 1 },
  { sequence: 6, week: 2 },
  { sequence: 10, week: 3 },
]

describe('survey timing uses the stored cohort deadline', () => {
  it('opens pre, then mid, then post inside the first exercise slot', () => {
    const exercise = cohort[0]
    const week = (deadlineAt - enrolledAt) / 3
    const slot = week / 5
    const pre = enrolledAt + 60
    const mid = enrolledAt + slot / 3 + 60
    const post = enrolledAt + (2 * slot) / 3 + 60
    const after = enrolledAt + slot + 60

    assert.equal(isExercisePhaseOpen(pre, enrolledAt, deadlineAt, exercise, cohort, 'pre'), true)
    assert.equal(isExercisePhaseOpen(pre, enrolledAt, deadlineAt, exercise, cohort, 'mid'), false)
    assert.equal(isExercisePhaseOpen(pre, enrolledAt, deadlineAt, exercise, cohort, 'post'), false)
    assert.equal(isExercisePhaseOpen(mid, enrolledAt, deadlineAt, exercise, cohort, 'mid'), true)
    assert.equal(isExercisePhaseOpen(mid, enrolledAt, deadlineAt, exercise, cohort, 'pre'), false)
    assert.equal(isExercisePhaseOpen(post, enrolledAt, deadlineAt, exercise, cohort, 'post'), true)
    assert.equal(isExercisePhaseOpen(after, enrolledAt, deadlineAt, exercise, cohort, 'post'), false)
  })

  it('does not open a phase when the stored deadline is missing', () => {
    assert.equal(isExercisePhaseOpen(enrolledAt + 60, enrolledAt, enrolledAt, cohort[0], cohort, 'pre'), false)
  })
})
