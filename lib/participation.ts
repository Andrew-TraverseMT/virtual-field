export const SURVEY_PHASES = ['pre', 'mid', 'post'] as const
export type ParticipationPhase = (typeof SURVEY_PHASES)[number]

/**
 * Participation is `percent` percent of the combined course total.
 * Assignment points stay as authored. The credit slice is the remainder.
 */
export function participationPoints(assignmentPoints: number, percent: number): number {
  if (!Number.isFinite(assignmentPoints) || assignmentPoints <= 0) return 0
  if (!Number.isFinite(percent) || percent <= 0 || percent >= 100) return 0
  return Math.round((assignmentPoints * percent) / (100 - percent))
}

/** Credit for the survey path requires pre, mid, and post on every exercise. */
export function surveyParticipationComplete(
  exerciseSequences: number[],
  completed: { exercise: number; phase: string }[],
): boolean {
  if (exerciseSequences.length === 0) return false
  const have = new Set(completed.map((row) => `${row.exercise}:${row.phase}`))
  return exerciseSequences.every((exercise) =>
    SURVEY_PHASES.every((phase) => have.has(`${exercise}:${phase}`)),
  )
}

export type ParticipationPath = 'survey' | 'alternative'

export type ParticipationEvent = {
  studentId: string
  path: ParticipationPath
}

/**
 * Instructor-facing credit is a yes/no per student.
 * The path and the consent decision are not part of this view.
 */
export function projectParticipationForInstructor(events: ParticipationEvent[]): {
  studentId: string
  participationCredit: true
}[] {
  const ids = [...new Set(events.map((event) => event.studentId))]
  return ids.map((studentId) => ({ studentId, participationCredit: true }))
}
