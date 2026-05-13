import { NextRequest, NextResponse } from 'next/server'
import { sql } from '@/lib/db'

const SEVEN_DAYS_SEC = 7 * 24 * 60 * 60
const ONE_HOUR_SEC = 60 * 60

export async function GET(req: NextRequest) {
  const secret = req.headers.get('authorization')?.replace('Bearer ', '')
  if (!secret || secret !== process.env.CRON_SECRET) {
    return NextResponse.json({ error: 'Unauthorized.' }, { status: 401 })
  }

  const now = Math.floor(Date.now() / 1000)

  // Delete expired password reset tokens (older than 1 hour)
  const r1 = await sql`DELETE FROM password_reset_tokens WHERE created_at < ${now - ONE_HOUR_SEC}`

  // Delete unverified registered_users older than 7 days
  const r2 = await sql`DELETE FROM registered_users WHERE verified = 0 AND created_at < ${now - SEVEN_DAYS_SEC}`

  return NextResponse.json({
    deletedTokens: r1.rowCount ?? 0,
    deletedUnverifiedUsers: r2.rowCount ?? 0,
    ranAt: new Date().toISOString(),
  })
}
