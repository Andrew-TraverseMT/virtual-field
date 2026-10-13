export const AI_DRAFT_FIELDS = [
  'ai_grade',
  'ai_feedback',
  'ai_rubric_scores',
  'ai_model',
  'ai_graded_at',
] as const

export const INSTRUCTOR_FINAL_FIELDS = [
  'status',
  'instructor_grade',
  'instructor_notes',
  'instructor_reviewed_at',
] as const

export type StoredGrade = {
  ai_grade: number | null
  ai_feedback: string | null
  ai_rubric_scores: string | null
  ai_model: string | null
  ai_graded_at: number | null
  instructor_grade: number | null
  instructor_notes: string | null
  instructor_reviewed_at: number | null
  status: string
}

export type InstructorFinal = {
  status: string
  instructor_grade: number | null
  instructor_notes: string | null
  instructor_reviewed_at: number
}

/** Copies the instructor decision onto a row and leaves the AI draft fields as they were. */
export function applyInstructorFinal<T extends StoredGrade>(row: T, final: InstructorFinal): T {
  return {
    ...row,
    status: final.status,
    instructor_grade: final.instructor_grade,
    instructor_notes: final.instructor_notes,
    instructor_reviewed_at: final.instructor_reviewed_at,
  }
}

export type GradeComparison =
  | { suppressed: true }
  | {
      suppressed: false
      n: number
      meanAi: number
      meanInstructor: number
      meanAbsoluteDifference: number
    }

export function gradeComparisonAggregate(
  rows: { aiGrade: number | null; instructorGrade: number | null }[],
  minimum = 5,
): GradeComparison {
  const paired = rows.filter(
    (row): row is { aiGrade: number; instructorGrade: number } =>
      typeof row.aiGrade === 'number' && typeof row.instructorGrade === 'number',
  )
  if (paired.length < minimum) return { suppressed: true }
  let aiSum = 0
  let instructorSum = 0
  let absSum = 0
  for (const row of paired) {
    aiSum += row.aiGrade
    instructorSum += row.instructorGrade
    absSum += Math.abs(row.aiGrade - row.instructorGrade)
  }
  const n = paired.length
  return {
    suppressed: false,
    n,
    meanAi: aiSum / n,
    meanInstructor: instructorSum / n,
    meanAbsoluteDifference: absSum / n,
  }
}
