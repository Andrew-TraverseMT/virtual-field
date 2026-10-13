import assert from 'node:assert/strict'
import { describe, it } from 'node:test'
import {
  SMALL_CELL_MINIMUM,
  SURVEY_RESPONSE_COLUMNS,
  canSetGradesPosted,
  canViewConsentList,
  canViewSurveyRows,
  gateConsentList,
  instructorAggregate,
  parseParticipantCode,
  parseSurveyAnswers,
  type SurveyQuestion,
} from './study-access.ts'

const scale: SurveyQuestion = {
  id: 'confidence',
  type: 'scale',
  label: 'I can do this',
  min: 0,
  max: 100,
}
const note: SurveyQuestion = {
  id: 'note',
  type: 'text',
  label: 'Note',
  optional: true,
}

describe('consent list visibility', () => {
  it('allows only the consent holder before grades are posted', async () => {
    assert.equal(canViewConsentList('consent_holder', false), true)
    assert.equal(canViewConsentList('consent_holder', true), false)
    assert.equal(canViewConsentList('instructor', false), false)
    assert.equal(canViewConsentList('instructor', true), false)
    assert.equal(canViewConsentList('student', false), false)
    assert.equal(canViewConsentList(null, false), false)
  })

  it('does not query the consent list when the role is refused', async () => {
    let called = false
    const query = async () => {
      called = true
      return [{ email: 'student@example.edu' }]
    }

    const instructor = await gateConsentList('instructor', false, query)
    const student = await gateConsentList('student', false, query)
    const afterGrades = await gateConsentList('consent_holder', true, query)

    assert.equal(instructor.allowed, false)
    assert.equal(student.allowed, false)
    assert.equal(afterGrades.allowed, false)
    assert.equal(called, false)

    const allowed = await gateConsentList('consent_holder', false, async () => ['row'])
    assert.deepEqual(allowed, { allowed: true, rows: ['row'] })
  })

  it('lets the instructor or consent holder mark grades posted', () => {
    assert.equal(canSetGradesPosted('instructor'), true)
    assert.equal(canSetGradesPosted('consent_holder'), true)
    assert.equal(canSetGradesPosted('student'), false)
    assert.equal(canSetGradesPosted(null), false)
  })
})

describe('aggregate-only instructor view', () => {
  it('never grants row-level survey access', () => {
    assert.equal(canViewSurveyRows('instructor'), false)
    assert.equal(canViewSurveyRows('consent_holder'), false)
    assert.equal(canViewSurveyRows('student'), false)
  })

  it('stores survey responses without identity columns', () => {
    const columns = SURVEY_RESPONSE_COLUMNS.join(',')
    assert.equal(columns.includes('student'), false)
    assert.equal(columns.includes('email'), false)
    assert.equal(columns.includes('name'), false)
  })

  it('suppresses cells smaller than 5, including the exact count and free text', () => {
    const rows = [1, 2, 3].map((exercise) => ({
      exercise: 1,
      phase: 'pre' as const,
      answers: { confidence: 90 + exercise, note: `My name is Student ${exercise}` },
    }))
    const aggregate = instructorAggregate(rows, { pre: [scale, note], mid: [], post: [] })
    const serialized = JSON.stringify(aggregate)

    assert.equal(aggregate.length, 1)
    assert.deepEqual(aggregate[0].responses, { suppressed: true })
    assert.deepEqual(aggregate[0].numeric[0].summary, { suppressed: true })
    assert.equal(serialized.includes('Student'), false)
    assert.equal(serialized.includes('91'), false)
    assert.equal(serialized.includes('code'), false)
    assert.equal(SMALL_CELL_MINIMUM, 5)
  })

  it('returns count and numeric summaries once five responses exist, still without text', () => {
    const rows = [10, 20, 30, 40, 50].map((confidence) => ({
      exercise: 2,
      phase: 'mid' as const,
      answers: { confidence, note: 'Ada Lovelace wrote this' },
    }))
    const aggregate = instructorAggregate(rows, { pre: [], mid: [scale, note], post: [] })
    const serialized = JSON.stringify(aggregate)

    assert.deepEqual(aggregate[0].responses, { suppressed: false, n: 5 })
    assert.deepEqual(aggregate[0].numeric[0].summary, {
      suppressed: false,
      n: 5,
      mean: 30,
      min: 10,
      max: 50,
    })
    assert.equal(serialized.includes('Ada'), false)
    assert.equal(serialized.includes('note'), false)
  })
})

describe('survey payload', () => {
  it('rejects identity fields and accepts a linking code that is not an email or account id', () => {
    const parsed = parseSurveyAnswers(
      { confidence: 40, note: 'muddiest point', email: 'a@b.edu' },
      [scale, note],
    )
    assert.equal(parsed.ok, false)
    assert.equal(parseParticipantCode('River-42', ['student-001', 'ada@example.edu']), 'River-42')
    assert.equal(parseParticipantCode('student-001', ['student-001']), null)
    assert.equal(parseParticipantCode('ada@example.edu', []), null)
    assert.equal(parseParticipantCode('short', []), null)
  })
})
