export type SurveyPhase = 'pre' | 'mid' | 'post'

export type DatedExercise = {
  sequence: number
  week: number
}

/**
 * Survey windows are thirds of the exercise slot inside the cohort dates
 * already stored on the student: enrolled_at and deadline_at.
 * Account creation sets deadline_at to three weeks after the roster start date.
 * This module does not keep a second calendar.
 */
export function exerciseDueWindow(
  enrolledAt: number,
  deadlineAt: number,
  exercise: DatedExercise,
  cohort: DatedExercise[],
): { opensAt: number; dueAt: number } | null {
  if (!Number.isFinite(enrolledAt) || !Number.isFinite(deadlineAt) || deadlineAt <= enrolledAt) return null
  if (!Number.isInteger(exercise.week) || exercise.week < 1 || exercise.week > 3) return null
  const span = deadlineAt - enrolledAt
  const weekStart = enrolledAt + ((exercise.week - 1) * span) / 3
  const weekEnd = enrolledAt + (exercise.week * span) / 3
  const peers = cohort
    .filter((item) => item.week === exercise.week)
    .sort((a, b) => a.sequence - b.sequence)
  const index = peers.findIndex((item) => item.sequence === exercise.sequence)
  if (index < 0 || peers.length === 0) return null
  const slot = (weekEnd - weekStart) / peers.length
  return {
    opensAt: weekStart + index * slot,
    dueAt: weekStart + (index + 1) * slot,
  }
}

export function surveyPhaseWindow(
  opensAt: number,
  dueAt: number,
  phase: SurveyPhase,
): { opensAt: number; closesAt: number } | null {
  if (!Number.isFinite(opensAt) || !Number.isFinite(dueAt) || dueAt <= opensAt) return null
  const span = dueAt - opensAt
  if (phase === 'pre') return { opensAt, closesAt: opensAt + span / 3 }
  if (phase === 'mid') return { opensAt: opensAt + span / 3, closesAt: opensAt + (2 * span) / 3 }
  return { opensAt: opensAt + (2 * span) / 3, closesAt: dueAt }
}

export function isExercisePhaseOpen(
  now: number,
  enrolledAt: number,
  deadlineAt: number,
  exercise: DatedExercise,
  cohort: DatedExercise[],
  phase: SurveyPhase,
): boolean {
  const due = exerciseDueWindow(enrolledAt, deadlineAt, exercise, cohort)
  if (!due) return false
  const window = surveyPhaseWindow(due.opensAt, due.dueAt, phase)
  if (!window) return false
  return now >= window.opensAt && now < window.closesAt
}
