import { NextRequest, NextResponse } from 'next/server'
import { getDB } from '@/lib/db'

const SEVEN_DAYS_SEC = 7 * 24 * 60 * 60
const ONE_HOUR_SEC = 60 * 60

export async function GET(req: NextRequest) {
  const secret = req.headers.get('authorization')?.replace('Bearer ', '')
  if (!secret || secret !== process.env.CRON_SECRET) {
    return NextResponse.json({ error: 'Unauthorized.' }, { status: 401 })
  }

  const db = getDB()
  const now = Math.floor(Date.now() / 1000)

  // Delete expired password reset tokens (older than 1 hour)
  const deletedTokens = db
    .prepare('DELETE FROM password_reset_tokens WHERE created_at < ?')
    .run(now - ONE_HOUR_SEC)

  // Delete unverified registered_users older than 7 days
  const deletedUsers = db
    .prepare('DELETE FROM registered_users WHERE verified = 0 AND created_at < ?')
    .run(now - SEVEN_DAYS_SEC)

  return NextResponse.json({
    deletedTokens: deletedTokens.changes,
    deletedUnverifiedUsers: deletedUsers.changes,
    ranAt: new Date().toISOString(),
  })
}
