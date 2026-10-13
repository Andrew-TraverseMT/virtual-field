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
