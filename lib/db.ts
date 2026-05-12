import Database from 'better-sqlite3'
import path from 'path'

let db: Database.Database | null = null

export function getDB(): Database.Database {
  if (!db) {
    const dbPath = path.join(process.cwd(), 'dev.db')
    db = new Database(dbPath)
    db.pragma('journal_mode = WAL')
    db.pragma('foreign_keys = ON')
    initSchema(db)
  }
  return db
}

function initSchema(database: Database.Database): void {
  database.exec(`
    CREATE TABLE IF NOT EXISTS students (
      id          TEXT PRIMARY KEY,
      name        TEXT NOT NULL,
      email       TEXT NOT NULL UNIQUE,
      enrolled_at INTEGER NOT NULL,
      deadline_at INTEGER NOT NULL
    );

    CREATE TABLE IF NOT EXISTS submissions (
      id                    TEXT PRIMARY KEY,
      student_id            TEXT NOT NULL,
      assignment_id         TEXT NOT NULL,
      submitted_at          INTEGER NOT NULL,
      file_name             TEXT,
      status                TEXT NOT NULL DEFAULT 'pending',
      ai_grade              INTEGER,
      ai_feedback           TEXT,
      ai_rubric_scores      TEXT,
      instructor_grade      INTEGER,
      instructor_notes      TEXT,
      instructor_reviewed_at INTEGER,
      FOREIGN KEY (student_id) REFERENCES students(id),
      UNIQUE(student_id, assignment_id)
    );
  `)

  // Seed the hardcoded test student
  const existing = database
    .prepare('SELECT id FROM students WHERE email = ?')
    .get('student@virtualfield.dev')

  if (!existing) {
    const now = Math.floor(Date.now() / 1000)
    const threeWeeks = 21 * 24 * 60 * 60
    database
      .prepare(
        `INSERT INTO students (id, name, email, enrolled_at, deadline_at)
         VALUES (?, ?, ?, ?, ?)`
      )
      .run('student-001', 'Test Student', 'student@virtualfield.dev', now, now + threeWeeks)
  }
}

export type Submission = {
  id: string
  student_id: string
  assignment_id: string
  submitted_at: number
  file_name: string | null
  status: 'pending' | 'graded' | 'approved' | 'revision_requested'
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
  enrolled_at: number
  deadline_at: number
}
