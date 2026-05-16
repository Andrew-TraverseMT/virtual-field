import { NextRequest, NextResponse } from 'next/server'
import { initSchema, sql } from '@/lib/db'

/**
 * One-time database setup endpoint.
 * Call once after provisioning Vercel Postgres:
 *   curl -X POST https://your-app.vercel.app/api/setup \
 *        -H "Authorization: Bearer <CRON_SECRET>"
 *
 * All DDL statements are idempotent (IF NOT EXISTS / ON CONFLICT DO NOTHING),
 * so calling this multiple times is safe.
 */
export async function POST(req: NextRequest) {
  const secret = req.headers.get('authorization')?.replace('Bearer ', '')
  if (!secret || secret !== process.env.CRON_SECRET) {
    return NextResponse.json({ error: 'Unauthorized.' }, { status: 401 })
  }

  await initSchema()
  return NextResponse.json({ ok: true, message: 'Schema initialized.' })
}

/**
 * Reset the test student (student-001) for a clean test run:
 *   curl -X DELETE https://your-app.vercel.app/api/setup \
 *        -H "Authorization: Bearer <CRON_SECRET>"
 *
 * Deletes all submissions for student-001 and refreshes their deadline to 3 weeks from now.
 */
export async function DELETE(req: NextRequest) {
  const secret = req.headers.get('authorization')?.replace('Bearer ', '')
  if (!secret || secret !== process.env.CRON_SECRET) {
    return NextResponse.json({ error: 'Unauthorized.' }, { status: 401 })
  }

  const { rowCount: deleted } = await sql`
    DELETE FROM submissions WHERE student_id = 'student-001'
  `

  const threeWeeks = 21 * 24 * 60 * 60
  const newDeadline = Math.floor(Date.now() / 1000) + threeWeeks
  await sql`
    UPDATE students SET deadline_at = ${newDeadline} WHERE id = 'student-001'
  `

  return NextResponse.json({ ok: true, submissionsDeleted: deleted ?? 0 })
}
