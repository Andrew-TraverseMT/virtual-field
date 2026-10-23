/**
 * One-off researcher account. Run on the host that has POSTGRES_URL.
 *
 *   npm run create-researcher -- --email <email> --name "Devon Orme" --affiliation "Montana State University"
 *
 * The temporary password is printed once on stdout. It is not written to a file,
 * the database (only the hash is stored), or this repository.
 */
import { randomBytes } from 'node:crypto'
import { parseArgs } from 'node:util'
import { sql } from '@vercel/postgres'
import bcrypt from 'bcryptjs'
import { TEMP_PASSWORD_TTL_SECONDS, generateTemporaryPassword } from '../lib/passwords.ts'
import { researcherAccountAction } from '../lib/researcher-account.ts'

const { values } = parseArgs({
  options: {
    email: { type: 'string' },
    name: { type: 'string' },
    affiliation: { type: 'string' },
  },
})

const email = values.email?.trim().toLowerCase() ?? ''
const name = values.name?.trim() ?? ''
const affiliation = values.affiliation?.trim() ?? ''

if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || name.length === 0 || name.length > 200) {
  console.error(
    'Usage: npm run create-researcher -- --email <email> --name "Full Name" --affiliation "Institution"',
  )
  process.exit(1)
}

async function ensureRegisteredUsers(): Promise<void> {
  await sql`
    CREATE TABLE IF NOT EXISTS registered_users (
      id                  TEXT PRIMARY KEY,
      name                TEXT NOT NULL,
      email               TEXT NOT NULL UNIQUE,
      password_hash       TEXT NOT NULL,
      role                TEXT NOT NULL DEFAULT 'student',
      verified            SMALLINT NOT NULL DEFAULT 0,
      email_bounced       SMALLINT NOT NULL DEFAULT 0,
      verification_token  TEXT UNIQUE,
      created_at          BIGINT NOT NULL
    )
  `
  await sql`
    ALTER TABLE registered_users ADD COLUMN IF NOT EXISTS role TEXT NOT NULL DEFAULT 'student'
  `
  await sql`
    ALTER TABLE registered_users ADD COLUMN IF NOT EXISTS verified SMALLINT NOT NULL DEFAULT 0
  `
  await sql`
    ALTER TABLE registered_users ADD COLUMN IF NOT EXISTS must_change_password SMALLINT NOT NULL DEFAULT 0
  `
  await sql`
    ALTER TABLE registered_users ADD COLUMN IF NOT EXISTS temp_password_expires_at BIGINT
  `
  await sql`
    ALTER TABLE registered_users ADD COLUMN IF NOT EXISTS affiliation TEXT
  `
}

async function emailUsedByStudent(address: string): Promise<boolean> {
  try {
    const { rows } = await sql`SELECT id FROM students WHERE email = ${address}`
    return rows.length > 0
  } catch {
    return false
  }
}

async function main(): Promise<void> {
  if (!process.env.POSTGRES_URL) {
    console.error('POSTGRES_URL is not set. Run this on the host that has the database.')
    process.exit(1)
  }

  await ensureRegisteredUsers()

  if (await emailUsedByStudent(email)) {
    console.error('An account with that email already exists.')
    process.exit(1)
  }

  const { rows } = await sql`
    SELECT id, role, must_change_password
    FROM registered_users
    WHERE email = ${email}
  `
  const row = rows[0] as { id: string; role: string; must_change_password: number | null } | undefined
  const action = researcherAccountAction(
    row
      ? { role: row.role, mustChangePassword: Number(row.must_change_password) === 1 }
      : null,
  )

  if (action === 'refuse') {
    console.error('An account with that email already exists.')
    process.exit(1)
  }

  const password = generateTemporaryPassword()
  const passwordHash = await bcrypt.hash(password, 12)
  const now = Math.floor(Date.now() / 1000)
  const expiresAt = now + TEMP_PASSWORD_TTL_SECONDS
  const affiliationValue = affiliation.length > 0 ? affiliation : null

  if (action === 'create') {
    const id = `user-${randomBytes(8).toString('hex')}`
    await sql`
      INSERT INTO registered_users (
        id, name, email, password_hash, role, verified, created_at,
        must_change_password, temp_password_expires_at, affiliation
      )
      VALUES (
        ${id}, ${name}, ${email}, ${passwordHash}, ${'researcher'}, ${1}, ${now},
        ${1}, ${expiresAt}, ${affiliationValue}
      )
    `
  } else if (row) {
    await sql`
      UPDATE registered_users
      SET name = ${name},
          password_hash = ${passwordHash},
          affiliation = ${affiliationValue},
          must_change_password = 1,
          temp_password_expires_at = ${expiresAt},
          verified = 1
      WHERE id = ${row.id} AND role = ${'researcher'} AND must_change_password = 1
    `
  }

  const verb = action === 'reissue' ? 'reissued' : 'created'
  process.stdout.write(
    `Researcher account ${verb} for ${email}.\nThe temporary password is shown once. It expires in 7 days if it is not used.\n${password}\n`,
  )
}

main().catch((error: unknown) => {
  const message = error instanceof Error ? error.message : 'Could not create the researcher account.'
  console.error(message)
  process.exit(1)
})
