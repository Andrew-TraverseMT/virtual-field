import { randomBytes } from 'crypto'

export const TEMP_PASSWORD_TTL_SECONDS = 7 * 24 * 60 * 60

const BLOCKED_PASSWORDS = new Set([
  'test1234',
  'instructor1234',
  'password',
  'password1234',
])

export function passwordMeetsStrength(password: string): { ok: true } | { ok: false; error: string } {
  if (password.length < 12) return { ok: false, error: 'Use at least 12 characters.' }
  if (!/[a-z]/.test(password)) return { ok: false, error: 'Include a lowercase letter.' }
  if (!/[A-Z]/.test(password)) return { ok: false, error: 'Include an uppercase letter.' }
  if (!/[0-9]/.test(password)) return { ok: false, error: 'Include a digit.' }
  if (BLOCKED_PASSWORDS.has(password.toLowerCase())) {
    return { ok: false, error: 'Choose a password that is not a known demo password.' }
  }
  return { ok: true }
}

/** Unused temporary passwords stop working after 7 days. A cleared flag means it was already changed. */
export function temporaryPasswordExpired(
  mustChangePassword: boolean,
  expiresAt: number | null,
  now: number,
): boolean {
  if (!mustChangePassword) return false
  if (expiresAt == null) return false
  return now >= expiresAt
}

export function generateTemporaryPassword(): string {
  for (let attempt = 0; attempt < 8; attempt += 1) {
    const password = randomBytes(24).toString('base64url')
    if (passwordMeetsStrength(password).ok) return password
  }
  return randomBytes(32).toString('base64url')
}
