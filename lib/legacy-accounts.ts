/**
 * The only account schema init may remove is the old auto-created demo student.
 * Real accounts, including the two students from last year, are not in this predicate.
 */
export const SEED_STUDENT_ID = 'student-001'
export const SEED_STUDENT_EMAIL = 'student@virtualfield.dev'

export type AccountIdentity = {
  id: string
  email: string
}

export function isAutoSeedStudent(account: AccountIdentity): boolean {
  return account.id === SEED_STUDENT_ID && account.email.toLowerCase() === SEED_STUDENT_EMAIL
}

export function seedCleanupPlan<T extends AccountIdentity>(accounts: T[]): { remove: T[]; keep: T[] } {
  return {
    remove: accounts.filter((account) => isAutoSeedStudent(account)),
    keep: accounts.filter((account) => !isAutoSeedStudent(account)),
  }
}
