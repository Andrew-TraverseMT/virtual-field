import { NextRequest, NextResponse } from 'next/server'
import { initSchema } from '@/lib/db'

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
