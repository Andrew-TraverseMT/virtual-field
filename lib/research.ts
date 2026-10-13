import { randomUUID } from 'crypto'
import { sql } from '@/lib/db'
import { assignments } from '@/lib/assignments'
import { questionsFor, surveyPhases, type SurveyPhase } from '@/lib/surveys'
import {
  canPurgeConsent,
  canSetGradesPosted,
  gateConsentList,
  instructorAggregate,
  parseParticipantCode,
  parseSurveyAnswers,
  type AppRole,
  type InstructorAggregateGroup,
  type StoredSurveyRow,
} from '@/lib/study-access'
import { isExercisePhaseOpen } from '@/lib/survey-timing'
import {
  gradeComparisonAggregate,
  type GradeComparison,
} from '@/lib/grade-compare'
import type { ConsentEnvelope } from '@/lib/consent-crypto'

export async function readGradesPosted(): Promise<boolean> {
  const { rows } = await sql`SELECT grades_posted FROM study_settings WHERE id = 1`
  const row = rows[0] as { grades_posted?: number } | undefined
  return row?.grades_posted === 1
}

export async function hasConsentReceipt(receiptHash: string): Promise<boolean> {
  const { rows } = await sql`SELECT id FROM consent_records WHERE receipt_hash = ${receiptHash}`
  return rows.length > 0
}

export async function saveConsentCiphertext(input: {
  receiptHash: string
  envelope: ConsentEnvelope
}): Promise<{ ok: true } | { ok: false; error: string; status: number }> {
  if (await readGradesPosted()) {
    return { ok: false, error: 'Consent is closed because grades have been posted.', status: 409 }
  }
  const id = randomUUID()
  const now = Math.floor(Date.now() / 1000)
  const ciphertext = JSON.stringify(input.envelope)
  await sql`
    INSERT INTO consent_records (id, receipt_hash, ciphertext, kid, created_at)
    VALUES (${id}, ${input.receiptHash}, ${ciphertext}, ${input.envelope.kid}, ${now})
    ON CONFLICT (receipt_hash) DO UPDATE
    SET ciphertext = EXCLUDED.ciphertext,
        kid = EXCLUDED.kid,
        created_at = EXCLUDED.created_at
  `
  return { ok: true }
}

export type ConsentExportRecord = {
  id: string
  createdAt: number
  envelope: ConsentEnvelope
}

export async function exportConsentBundle(role: AppRole | null, actorId: string): Promise<
  | { allowed: false; gradesPosted: boolean }
  | { allowed: true; gradesPosted: false; records: ConsentExportRecord[] }
> {
  const gradesPosted = await readGradesPosted()
  const gated = await gateConsentList(role, gradesPosted, async () => {
    const { rows } = await sql`
      SELECT id, ciphertext, created_at
      FROM consent_records
      ORDER BY created_at ASC
    `
    return rows as { id: string; ciphertext: string; created_at: number }[]
  })
  if (!gated.allowed) return { allowed: false, gradesPosted }
  const records: ConsentExportRecord[] = []
  for (const row of gated.rows) {
    try {
      const envelope = JSON.parse(row.ciphertext) as ConsentEnvelope
      if (envelope && typeof envelope === 'object' && envelope.v === 1) {
        records.push({ id: row.id, createdAt: row.created_at, envelope })
      }
    } catch {
      continue
    }
  }
  await writeStudyAudit(actorId, 'consent_export', { count: records.length })
  return { allowed: true, gradesPosted: false, records }
}

export async function purgeConsentRecords(role: AppRole | null, actorId: string): Promise<
  | { ok: true; count: number }
  | { ok: false; error: string; status: number }
> {
  if (!canPurgeConsent(role)) {
    return { ok: false, error: 'Forbidden', status: 403 }
  }
  const { rows } = await sql`SELECT COUNT(*)::int AS n FROM consent_records`
  const count = Number((rows[0] as { n?: number } | undefined)?.n ?? 0)
  await sql`DELETE FROM consent_records`
  let legacy = 0
  try {
    const legacyRows = await sql`SELECT COUNT(*)::int AS n FROM research_consent`
    legacy = Number((legacyRows.rows[0] as { n?: number } | undefined)?.n ?? 0)
    await sql`DELETE FROM research_consent`
  } catch {
    legacy = 0
  }
  await writeStudyAudit(actorId, 'consent_purge', { consentRecords: count, legacyPlaintextRows: legacy })
  return { ok: true, count: count + legacy }
}

async function writeStudyAudit(actorId: string, action: string, detail: Record<string, number>): Promise<void> {
  const id = randomUUID()
  const now = Math.floor(Date.now() / 1000)
  await sql`
    INSERT INTO study_audit (id, action, actor_id, created_at, detail)
    VALUES (${id}, ${action}, ${actorId}, ${now}, ${JSON.stringify(detail)})
  `
}

export async function submitSurvey(input: {
  participantCode: string
  exercise: number
  phase: SurveyPhase
  answers: unknown
  forbiddenCodes: string[]
  now: number
  enrolledAt: number
  deadlineAt: number
}): Promise<{ ok: true } | { ok: false; error: string; status: number }> {
  const code = parseParticipantCode(input.participantCode, input.forbiddenCodes)
  if (!code) {
    return {
      ok: false,
      error: 'Use a linking code of 8–40 letters, numbers, or hyphens. Do not use your name, email, or account id.',
      status: 400,
    }
  }
  if (!surveyPhases.includes(input.phase)) {
    return { ok: false, error: 'Unknown survey phase.', status: 400 }
  }
  const assignment = assignments.find((item) => item.sequence === input.exercise)
  if (!assignment) {
    return { ok: false, error: 'Unknown exercise.', status: 400 }
  }
  const cohort = assignments.map((item) => ({ sequence: item.sequence, week: item.week }))
  if (!isExercisePhaseOpen(input.now, input.enrolledAt, input.deadlineAt, assignment, cohort, input.phase)) {
    return { ok: false, error: 'This survey is not open yet.', status: 403 }
  }
  const parsed = parseSurveyAnswers(input.answers, questionsFor(input.phase))
  if (!parsed.ok) return { ok: false, error: parsed.error, status: 400 }

  const id = randomUUID()
  const now = input.now
  const answers = JSON.stringify(parsed.answers)
  await sql`
    INSERT INTO survey_responses (id, participant_code, exercise, phase, answers, submitted_at)
    VALUES (${id}, ${code}, ${input.exercise}, ${input.phase}, ${answers}, ${now})
    ON CONFLICT (participant_code, exercise, phase) DO UPDATE
    SET answers = EXCLUDED.answers,
        submitted_at = EXCLUDED.submitted_at
  `
  return { ok: true }
}

export async function loadInstructorAggregate(role: AppRole | null): Promise<
  | { allowed: false }
  | { allowed: true; groups: InstructorAggregateGroup[] }
> {
  if (role !== 'instructor' && role !== 'consent_holder') return { allowed: false }
  const { rows } = await sql`
    SELECT exercise, phase, answers
    FROM survey_responses
  `
  const stored: StoredSurveyRow[] = []
  for (const row of rows as { exercise: number; phase: string; answers: string }[]) {
    if (row.phase !== 'pre' && row.phase !== 'mid' && row.phase !== 'post') continue
    let answers: Record<string, unknown> = {}
    try {
      const parsed = JSON.parse(row.answers) as unknown
      if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) {
        answers = parsed as Record<string, unknown>
      }
    } catch {
      answers = {}
    }
    stored.push({ exercise: Number(row.exercise), phase: row.phase, answers })
  }
  const questionsByPhase = {
    pre: questionsFor('pre'),
    mid: questionsFor('mid'),
    post: questionsFor('post'),
  }
  return { allowed: true, groups: instructorAggregate(stored, questionsByPhase) }
}

/**
 * Marks grades posted. This is one-way. The app has no official grade-posting event.
 * It does not read consent ciphertext and does not delete survey responses.
 * The consent holder exports and purges the encrypted records separately.
 */
export async function releaseAfterGradesPosted(role: AppRole | null): Promise<
  | { ok: true }
  | { ok: false; error: string; status: number }
> {
  if (!canSetGradesPosted(role)) {
    return { ok: false, error: 'Forbidden', status: 403 }
  }
  if (await readGradesPosted()) {
    return { ok: false, error: 'Grades are already marked posted.', status: 409 }
  }

  const now = Math.floor(Date.now() / 1000)
  await sql`
    UPDATE study_settings
    SET grades_posted = 1,
        grades_posted_at = ${now}
    WHERE id = 1
  `
  return { ok: true }
}

export async function loadGradeComparison(role: AppRole | null): Promise<
  | { allowed: false }
  | { allowed: true; summary: GradeComparison }
> {
  if (role !== 'instructor' && role !== 'consent_holder') return { allowed: false }
  const { rows } = await sql`SELECT ai_grade, instructor_grade FROM submissions`
  const pairs = (rows as { ai_grade: number | null; instructor_grade: number | null }[]).map((row) => ({
    aiGrade: row.ai_grade,
    instructorGrade: row.instructor_grade,
  }))
  return { allowed: true, summary: gradeComparisonAggregate(pairs) }
}

/** Records credit without storing whether the student used surveys or the alternative. */
export async function recordParticipationCredit(studentId: string): Promise<void> {
  const now = Math.floor(Date.now() / 1000)
  await sql`
    INSERT INTO participation_credit (student_id, credited_at)
    VALUES (${studentId}, ${now})
    ON CONFLICT (student_id) DO NOTHING
  `
}

export async function saveParticipationAlternative(studentId: string, response: string): Promise<
  | { ok: true }
  | { ok: false; error: string; status: number }
> {
  const text = response.trim()
  if (text.length < 40) {
    return { ok: false, error: 'Write at least a short paragraph.', status: 400 }
  }
  if (text.length > 4000) {
    return { ok: false, error: 'That reflection is too long.', status: 400 }
  }
  const now = Math.floor(Date.now() / 1000)
  await sql`
    INSERT INTO participation_alternative (student_id, response, submitted_at)
    VALUES (${studentId}, ${text}, ${now})
    ON CONFLICT (student_id) DO UPDATE
    SET response = EXCLUDED.response,
        submitted_at = EXCLUDED.submitted_at
  `
  await recordParticipationCredit(studentId)
  return { ok: true }
}
