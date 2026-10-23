/** Roles an instructor may assign from the roster UI. Researcher is not one of them. */
export function roleFromInstructorUi(requested: unknown): 'instructor' | null {
  if (requested == null || requested === '' || requested === 'instructor') return 'instructor'
  return null
}
