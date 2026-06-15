import {
  sql as vercelSql,
  type QueryResult,
  type QueryResultRow,
} from '@vercel/postgres'

type Primitive = string | number | boolean | undefined | null

let schemaInitPromise: Promise<void> | null = null

export async function sql<O extends QueryResultRow>(
  strings: TemplateStringsArray,
  ...values: Primitive[]
): Promise<QueryResult<O>> {
  await ensureSchema()
  return vercelSql<O>(strings, ...values)
}

export function ensureSchema(): Promise<void> {
  if (!schemaInitPromise) {
    schemaInitPromise = initSchema().catch((error) => {
      schemaInitPromise = null
      throw error
    })
  }

  return schemaInitPromise
}

/**
 * Run once after provisioning the Vercel Postgres database.
 * Call via POST /api/setup (protected by CRON_SECRET) or run manually.
 * All statements are idempotent (IF NOT EXISTS / ON CONFLICT DO NOTHING).
 */
export async function initSchema(): Promise<void> {
  await vercelSql`
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
  await vercelSql`
    ALTER TABLE registered_users ADD COLUMN IF NOT EXISTS role TEXT NOT NULL DEFAULT 'student'
  `
  await vercelSql`
    CREATE TABLE IF NOT EXISTS students (
      id           TEXT PRIMARY KEY,
      name         TEXT NOT NULL,
      email        TEXT NOT NULL UNIQUE,
      owner_instructor_id TEXT,
      enrolled_at  BIGINT NOT NULL,
      deadline_at  BIGINT NOT NULL,
      temp_password TEXT
    )
  `
  await vercelSql`
    ALTER TABLE students ADD COLUMN IF NOT EXISTS owner_instructor_id TEXT
  `
  // Migration: add temp_password to existing deployments
  await vercelSql`
    ALTER TABLE students ADD COLUMN IF NOT EXISTS temp_password TEXT
  `
  // Migration: add deadline_at to existing deployments (default 1 year from now)
  await vercelSql`
    ALTER TABLE students ADD COLUMN IF NOT EXISTS deadline_at BIGINT NOT NULL DEFAULT (EXTRACT(EPOCH FROM NOW())::BIGINT + 31536000)
  `
  // Migration: add enrolled_at to existing deployments (default to now)
  await vercelSql`
    ALTER TABLE students ADD COLUMN IF NOT EXISTS enrolled_at BIGINT NOT NULL DEFAULT (EXTRACT(EPOCH FROM NOW())::BIGINT)
  `
  await vercelSql`
    CREATE TABLE IF NOT EXISTS password_reset_tokens (
      token      TEXT PRIMARY KEY,
      user_id    TEXT NOT NULL,
      created_at BIGINT NOT NULL
    )
  `
  await vercelSql`
    CREATE TABLE IF NOT EXISTS submissions (
      id                     TEXT PRIMARY KEY,
      student_id             TEXT NOT NULL,
      assignment_id          TEXT NOT NULL,
      submitted_at           BIGINT NOT NULL,
      file_name              TEXT,
      file_url               TEXT,
      status                 TEXT NOT NULL DEFAULT 'pending',
      ai_grade               INTEGER,
      ai_feedback            TEXT,
      ai_rubric_scores       TEXT,
      instructor_grade       INTEGER,
      instructor_notes       TEXT,
      instructor_reviewed_at BIGINT,
      FOREIGN KEY (student_id) REFERENCES students(id),
      UNIQUE(student_id, assignment_id)
    )
  `

  // Seed the hardcoded test student.
  // ON CONFLICT DO NOTHING handles both the primary-key (id) and the unique email
  // constraint — so re-running ensureSchema after the student was deleted (or after
  // another account claimed that email) never crashes.
  const now = Math.floor(Date.now() / 1000)
  const threeWeeks = 21 * 24 * 60 * 60
  await vercelSql`
    INSERT INTO students (id, name, email, enrolled_at, deadline_at)
    VALUES ('student-001', 'Test Student', 'student@virtualfield.dev', ${now}, ${now + threeWeeks})
    ON CONFLICT DO NOTHING
  `
  // Separately refresh the deadline so the test account never expires
  await vercelSql`
    UPDATE students SET deadline_at = ${now + threeWeeks}
    WHERE id = 'student-001' AND deadline_at < ${now + threeWeeks}
  `
  await vercelSql`
    UPDATE students
    SET owner_instructor_id = 'instructor-001'
    WHERE id <> 'student-001' AND owner_instructor_id IS NULL
  `
}

export type Submission = {
  id: string
  student_id: string
  assignment_id: string
  submitted_at: number
  file_name: string | null
  file_url: string | null
  // 'pending'        → saved, AI grading in progress
  // 'ai_graded'      → AI grade stored, awaiting instructor review (hidden from student)
  // 'approved'       → instructor approved AI grade (student can see)
  // 'graded'         → instructor modified grade (student can see)
  // 'revision_requested' → instructor asked for resubmission
  status: 'pending' | 'ai_graded' | 'graded' | 'approved' | 'revision_requested'
  ai_grade: number | null
  ai_feedback: string | null
  ai_rubric_scores: string | null
  instructor_grade: number | null
  instructor_notes: string | null
  instructor_reviewed_at: number | null
}

export type Student = {
  id: string
  name: string
  email: string
  owner_instructor_id: string | null
  enrolled_at: number
  deadline_at: number
}

export type RegisteredUser = {
  id: string
  name: string
  email: string
  password_hash: string
  role: 'student' | 'instructor'
  verified: 0 | 1
  email_bounced: 0 | 1
  verification_token: string | null
  created_at: number
}
