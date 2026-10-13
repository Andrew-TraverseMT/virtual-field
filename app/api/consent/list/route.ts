import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth/next'
import { authOptions } from '@/lib/auth'
import { sql } from '@/lib/db'
import { readGradesPosted } from '@/lib/research'
import { gateConsentList } from '@/lib/study-access'
import { sessionRole } from '@/lib/session'

export async function GET() {
  const session = await getServerSession(authOptions)
  const role = sessionRole(session)
  const gradesPosted = await readGradesPosted()
  const gated = await gateConsentList(role, gradesPosted, async () => {
    const { rows } = await sql`SELECT COUNT(*)::int AS n FROM consent_records`
    return Number((rows[0] as { n?: number } | undefined)?.n ?? 0)
  })
  if (!gated.allowed) {
    return NextResponse.json(
      { error: 'The consent list is not available to this account.' },
      { status: 403 },
    )
  }
  return NextResponse.json({ count: gated.rows })
}
