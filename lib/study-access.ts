export const SMALL_CELL_MINIMUM = 5

export const APP_ROLES = ['student', 'instructor', 'researcher'] as const
export type AppRole = (typeof APP_ROLES)[number]

export type SurveyPhase = 'pre' | 'mid' | 'post'

export type SurveyQuestion = {
  id: string
  type: 'scale' | 'text'
  label: string
  min?: number
  max?: number
  maxLength?: number
  optional?: boolean
}

const BANNED_BODY_KEYS = new Set([
  'studentid',
  'student_id',
  'userid',
  'user_id',
  'email',
  'name',
  'ip',
  'participantid',
])

/** Columns written for a survey response. Identity fields are intentionally absent. */
export const SURVEY_RESPONSE_COLUMNS = [
  'id',
  'participant_code',
  'exercise',
  'phase',
  'answers',
  'submitted_at',
] as const

/**
 * Consent records are readable by the researcher only, and only before
 * grades are marked posted. Instructors never pass this check.
 */
export function canViewConsentList(role: AppRole | null, gradesPosted: boolean): boolean {
  return role === 'researcher' && gradesPosted === false
}

/** Only the instructor can mark grades posted. The researcher cannot. */
export function canSetGradesPosted(role: AppRole | null): boolean {
  return role === 'instructor'
}

export function canExportConsent(role: AppRole | null, gradesPosted: boolean): boolean {
  return canViewConsentList(role, gradesPosted)
}

/** Purge deletes consent and de-identified survey answers. Instructor cannot purge. */
export function canPurgeConsent(role: AppRole | null): boolean {
  return role === 'researcher'
}

/** Survey aggregates and the grade comparison are study data. Researcher only. */
export function canViewStudyData(role: AppRole | null): boolean {
  return role === 'researcher'
}

/** No role receives row-level survey responses. */
export function canViewSurveyRows(_role: AppRole | null): boolean {
  return false
}

export async function gateConsentList<T>(
  role: AppRole | null,
  gradesPosted: boolean,
  query: () => Promise<T>,
): Promise<{ allowed: true; rows: T } | { allowed: false }> {
  if (!canViewConsentList(role, gradesPosted)) return { allowed: false }
  return { allowed: true, rows: await query() }
}

export function parseParticipantCode(value: unknown, forbidden: string[] = []): string | null {
  if (typeof value !== 'string') return null
  const trimmed = value.trim()
  if (!/^[A-Za-z0-9][A-Za-z0-9-]{7,39}$/.test(trimmed)) return null
  const lower = trimmed.toLowerCase()
  if (forbidden.some((item) => item.trim().toLowerCase() === lower)) return null
  return trimmed
}

export function parseSurveyAnswers(
  input: unknown,
  questions: SurveyQuestion[],
): { ok: true; answers: Record<string, string | number> } | { ok: false; error: string } {
  if (!input || typeof input !== 'object' || Array.isArray(input)) {
    return { ok: false, error: 'Answers must be an object.' }
  }
  const record = input as Record<string, unknown>
  const allowed = new Set(questions.map((question) => question.id))
  for (const key of Object.keys(record)) {
    if (BANNED_BODY_KEYS.has(key.toLowerCase()) || !allowed.has(key)) {
      return { ok: false, error: 'Answers include a field this survey does not collect.' }
    }
  }

  const answers: Record<string, string | number> = {}
  for (const question of questions) {
    const raw = record[question.id]
    if (raw === undefined || raw === null || raw === '') {
      if (question.optional) continue
      return { ok: false, error: 'A required answer is missing.' }
    }
    if (question.type === 'scale') {
      if (typeof raw !== 'number' || !Number.isInteger(raw)) {
        return { ok: false, error: 'A scale answer must be a whole number.' }
      }
      if (question.min !== undefined && raw < question.min) {
        return { ok: false, error: 'A scale answer is out of range.' }
      }
      if (question.max !== undefined && raw > question.max) {
        return { ok: false, error: 'A scale answer is out of range.' }
      }
      answers[question.id] = raw
      continue
    }
    if (typeof raw !== 'string') {
      return { ok: false, error: 'A text answer must be text.' }
    }
    const text = raw.trim()
    const maxLength = question.maxLength ?? 2000
    if (text.length > maxLength) {
      return { ok: false, error: 'A text answer is too long.' }
    }
    if (!question.optional && text.length === 0) {
      return { ok: false, error: 'A required answer is missing.' }
    }
    answers[question.id] = text
  }
  return { ok: true, answers }
}

export type StoredSurveyRow = {
  exercise: number
  phase: SurveyPhase
  answers: Record<string, unknown>
}

export type NumericSummary =
  | { suppressed: true }
  | { suppressed: false; n: number; mean: number; min: number; max: number }

export type CountSummary = { suppressed: true } | { suppressed: false; n: number }

export function summarizeCount(n: number, minimum = SMALL_CELL_MINIMUM): CountSummary {
  if (!Number.isInteger(n) || n < minimum) return { suppressed: true }
  return { suppressed: false, n }
}

export function summarizeNumeric(values: number[], minimum = SMALL_CELL_MINIMUM): NumericSummary {
  if (values.length < minimum) return { suppressed: true }
  let sum = 0
  let min = values[0]
  let max = values[0]
  for (const value of values) {
    sum += value
    if (value < min) min = value
    if (value > max) max = value
  }
  return { suppressed: false, n: values.length, mean: sum / values.length, min, max }
}

export type InstructorAggregateGroup = {
  exercise: number
  phase: SurveyPhase
  responses: CountSummary
  numeric: { id: string; label: string; summary: NumericSummary }[]
}

/**
 * Study aggregate: counts and numeric summaries only.
 * Free-text answers are dropped. Groups smaller than the minimum are suppressed,
 * including the exact count. Row access stays closed for every role.
 */
export function instructorAggregate(
  rows: StoredSurveyRow[],
  questionsByPhase: Record<SurveyPhase, SurveyQuestion[]>,
  minimum = SMALL_CELL_MINIMUM,
): InstructorAggregateGroup[] {
  const groups = new Map<string, StoredSurveyRow[]>()
  for (const row of rows) {
    const key = `${row.exercise}:${row.phase}`
    const list = groups.get(key) ?? []
    list.push(row)
    groups.set(key, list)
  }

  const result: InstructorAggregateGroup[] = []
  for (const [key, group] of groups) {
    const [exerciseText, phase] = key.split(':') as [string, SurveyPhase]
    const questions = questionsByPhase[phase] ?? []
    const numeric = questions
      .filter((question) => question.type === 'scale')
      .map((question) => {
        const values = group
          .map((row) => row.answers[question.id])
          .filter((value): value is number => typeof value === 'number' && Number.isFinite(value))
        return { id: question.id, label: question.label, summary: summarizeNumeric(values, minimum) }
      })
    result.push({
      exercise: Number(exerciseText),
      phase,
      responses: summarizeCount(group.length, minimum),
      numeric,
    })
  }

  result.sort((a, b) => a.exercise - b.exercise || a.phase.localeCompare(b.phase))
  return result
}
