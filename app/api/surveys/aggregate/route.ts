import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth/next'
import { authOptions } from '@/lib/auth'
import { loadInstructorAggregate } from '@/lib/research'
import { sessionRole } from '@/lib/session'

export async function GET() {
  const session = await getServerSession(authOptions)
  const result = await loadInstructorAggregate(sessionRole(session))
  if (!result.allowed) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }
  return NextResponse.json({ groups: result.groups })
}
