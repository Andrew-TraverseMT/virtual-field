export type ExistingAccount = {
  role: string
  mustChangePassword: boolean
}

/**
 * A new email is created. An unused researcher temporary password can be reissued.
 * Any other existing account is refused, including a researcher who already set a password.
 */
export function researcherAccountAction(existing: ExistingAccount | null): 'create' | 'reissue' | 'refuse' {
  if (!existing) return 'create'
  if (existing.role === 'researcher' && existing.mustChangePassword) return 'reissue'
  return 'refuse'
}
