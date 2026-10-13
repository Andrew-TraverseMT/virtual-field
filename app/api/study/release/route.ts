import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth/next'
import { authOptions } from '@/lib/auth'
import { releaseAfterGradesPosted } from '@/lib/research'
import { sessionRole } from '@/lib/session'

export async function POST() {
  const session = await getServerSession(authOptions)
  const result = await releaseAfterGradesPosted(sessionRole(session))
  if (!result.ok) return NextResponse.json({ error: result.error }, { status: result.status })
  return NextResponse.json({ ok: true })
}
