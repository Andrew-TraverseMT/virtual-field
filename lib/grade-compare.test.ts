import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { describe, it } from 'node:test'
import {
  AI_DRAFT_FIELDS,
  INSTRUCTOR_FINAL_FIELDS,
  applyInstructorFinal,
  gradeComparisonAggregate,
  type StoredGrade,
} from './grade-compare.ts'

const draft: StoredGrade = {
  ai_grade: 16,
  ai_feedback: 'Solid map.',
  ai_rubric_scores: '{"screenshots":6}',
  ai_model: 'gemini-2.5-pro',
  ai_graded_at: 1_700_000_100,
  instructor_grade: null,
  instructor_notes: null,
  instructor_reviewed_at: null,
  status: 'ai_graded',
}

describe('draft and final grades stay separate', () => {
  it('keeps the AI draft when the instructor finalizes', () => {
    const finalized = applyInstructorFinal(draft, {
      status: 'graded',
      instructor_grade: 18,
      instructor_notes: 'Raised the cross section.',
      instructor_reviewed_at: 1_700_000_500,
    })

    assert.equal(finalized.ai_grade, 16)
    assert.equal(finalized.ai_model, 'gemini-2.5-pro')
    assert.equal(finalized.ai_graded_at, 1_700_000_100)
    assert.equal(finalized.ai_feedback, 'Solid map.')
    assert.equal(finalized.instructor_grade, 18)
    assert.equal(finalized.status, 'graded')
    for (const field of AI_DRAFT_FIELDS) {
      assert.equal(INSTRUCTOR_FINAL_FIELDS.includes(field as never), false)
    }
  })

  it('shows researchers an aggregate comparison only', () => {
    const small = gradeComparisonAggregate([
      { aiGrade: 10, instructorGrade: 12 },
      { aiGrade: 14, instructorGrade: 14 },
    ])
    assert.deepEqual(small, { suppressed: true })
    assert.equal(JSON.stringify(small).includes('10'), false)

    const summary = gradeComparisonAggregate([
      { aiGrade: 10, instructorGrade: 12 },
      { aiGrade: 20, instructorGrade: 18 },
      { aiGrade: 15, instructorGrade: 15 },
      { aiGrade: 8, instructorGrade: 10 },
      { aiGrade: 12, instructorGrade: 12 },
    ])
    assert.equal(summary.suppressed, false)
    if (!summary.suppressed) {
      assert.equal(summary.n, 5)
      assert.equal(summary.meanAi, 13)
      assert.equal(summary.meanInstructor, 13.4)
      assert.equal(summary.meanAbsoluteDifference, 1.2)
    }
  })

  it('does not write the draft columns from the instructor final route', () => {
    const source = readFileSync(new URL('../app/api/grades/[submissionId]/route.ts', import.meta.url), 'utf8')
    const updateStart = source.indexOf('UPDATE submissions')
    const updateEnd = source.indexOf('WHERE id', updateStart)
    const update = source.slice(updateStart, updateEnd)
    assert.equal(update.includes('ai_grade'), false)
    assert.equal(update.includes('ai_model'), false)
    assert.equal(update.includes('ai_graded_at'), false)
    assert.equal(update.includes('instructor_grade'), true)
  })
})
