import {
  sql as vercelSql,
  type QueryResult,
  type QueryResultRow,
} from '@vercel/postgres'
import { SEED_STUDENT_EMAIL, SEED_STUDENT_ID } from '@/lib/legacy-accounts'

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
    ALTER TABLE registered_users ADD COLUMN IF NOT EXISTS must_change_password SMALLINT NOT NULL DEFAULT 0
  `
  await vercelSql`
    ALTER TABLE registered_users ADD COLUMN IF NOT EXISTS temp_password_expires_at BIGINT
  `
  await vercelSql`
    ALTER TABLE registered_users ADD COLUMN IF NOT EXISTS affiliation TEXT
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
      ai_model               TEXT,
      ai_graded_at           BIGINT,
      FOREIGN KEY (student_id) REFERENCES students(id),
      UNIQUE(student_id, assignment_id)
    )
  `

  await vercelSql`
    ALTER TABLE submissions ADD COLUMN IF NOT EXISTS ai_model TEXT
  `
  await vercelSql`
    ALTER TABLE submissions ADD COLUMN IF NOT EXISTS ai_graded_at BIGINT
  `

  await vercelSql`
    CREATE TABLE IF NOT EXISTS consent_records (
      id TEXT PRIMARY KEY,
      receipt_hash TEXT NOT NULL UNIQUE,
      ciphertext TEXT NOT NULL,
      kid TEXT NOT NULL,
      created_at BIGINT NOT NULL
    )
  `
  await vercelSql`
    CREATE TABLE IF NOT EXISTS study_audit (
      id TEXT PRIMARY KEY,
      action TEXT NOT NULL,
      actor_id TEXT NOT NULL,
      created_at BIGINT NOT NULL,
      detail TEXT NOT NULL
    )
  `
  await vercelSql`
    CREATE TABLE IF NOT EXISTS participation_credit (
      student_id TEXT PRIMARY KEY REFERENCES students(id) ON DELETE CASCADE,
      credited_at BIGINT NOT NULL
    )
  `
  await vercelSql`
    CREATE TABLE IF NOT EXISTS survey_progress (
      student_id TEXT NOT NULL,
      exercise INTEGER NOT NULL,
      phase TEXT NOT NULL,
      completed_at BIGINT NOT NULL,
      PRIMARY KEY (student_id, exercise, phase)
    )
  `
  await vercelSql`
    CREATE TABLE IF NOT EXISTS participation_alternative (
      student_id TEXT PRIMARY KEY REFERENCES students(id) ON DELETE CASCADE,
      response TEXT NOT NULL,
      submitted_at BIGINT NOT NULL
    )
  `
  await vercelSql`
    CREATE TABLE IF NOT EXISTS survey_responses (
      id TEXT PRIMARY KEY,
      participant_code TEXT NOT NULL,
      exercise INTEGER NOT NULL,
      phase TEXT NOT NULL,
      answers TEXT NOT NULL,
      submitted_at BIGINT NOT NULL,
      UNIQUE (participant_code, exercise, phase),
      CONSTRAINT survey_responses_phase CHECK (phase IN ('pre', 'mid', 'post'))
    )
  `
  await vercelSql`
    CREATE TABLE IF NOT EXISTS study_settings (
      id INTEGER PRIMARY KEY,
      grades_posted SMALLINT NOT NULL DEFAULT 0,
      grades_posted_at BIGINT,
      consent_granted_count INTEGER,
      consent_declined_count INTEGER,
      CONSTRAINT study_settings_singleton CHECK (id = 1)
    )
  `
  await vercelSql`
    INSERT INTO study_settings (id, grades_posted)
    VALUES (1, 0)
    ON CONFLICT (id) DO NOTHING
  `

  // Remove the old demo student if a previous run created it.
  // Both id and email must match. Other accounts, including last year's students, stay.
  await vercelSql`
    DELETE FROM submissions
    WHERE student_id = ${SEED_STUDENT_ID}
      AND EXISTS (
        SELECT 1 FROM students
        WHERE id = ${SEED_STUDENT_ID} AND lower(email) = ${SEED_STUDENT_EMAIL}
      )
  `
  await vercelSql`
    DELETE FROM students
    WHERE id = ${SEED_STUDENT_ID} AND lower(email) = ${SEED_STUDENT_EMAIL}
  `

  // Drop the unreleased plaintext consent table only when it is empty.
  // Rows, if any, are not rewritten and are not served. Purge is the researcher's action.
  await vercelSql`
    DO $$
    BEGIN
      IF EXISTS (
        SELECT 1 FROM information_schema.tables
        WHERE table_schema = 'public' AND table_name = 'research_consent'
      ) THEN
        IF (SELECT COUNT(*) FROM research_consent) = 0 THEN
          DROP TABLE research_consent;
        END IF;
      END IF;
    END $$
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
  ai_model: string | null
  ai_graded_at: number | null
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
  role: 'student' | 'instructor' | 'researcher'
  verified: 0 | 1
  email_bounced: 0 | 1
  verification_token: string | null
  created_at: number
  must_change_password?: number
  temp_password_expires_at?: number | null
  affiliation?: string | null
}
