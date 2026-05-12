/**
 * POST /api/feedback
 *
 * Feedback engine — gives students formative AI feedback on a DRAFT before
 * formal submission. Mirrors the notebook's PDF-to-Gemini pipeline but:
 *   - Uses inline base64 (no persistent Gemini File API upload)
 *   - Returns feedback directly — nothing is stored in the DB
 *   - Never produces a grade or score
 *
 * Auth: any authenticated user (student or instructor).
 */

import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth/next'
import { authOptions } from '@/lib/auth'
import { assignments } from '@/lib/assignments'
import { getFeedback } from '@/lib/gemini'

export const runtime = 'nodejs'

export async function POST(request: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  let formData: FormData
  try {
    formData = await request.formData()
  } catch {
    return NextResponse.json({ error: 'Invalid form data' }, { status: 400 })
  }

  const assignmentId = formData.get('assignmentId')?.toString()
  if (!assignmentId) {
    return NextResponse.json({ error: 'assignmentId required' }, { status: 400 })
  }

  const assignment = assignments.find((a) => a.id === assignmentId)
  if (!assignment) {
    return NextResponse.json({ error: 'Assignment not found' }, { status: 404 })
  }

  const file = formData.get('file') as File | null
  if (!file || file.size === 0) {
    return NextResponse.json({ error: 'A PDF file is required' }, { status: 400 })
  }

  if (file.type !== 'application/pdf' && !file.name.toLowerCase().endsWith('.pdf')) {
    return NextResponse.json({ error: 'Only PDF files are accepted' }, { status: 400 })
  }

  // 10 MB limit for draft feedback (smaller than formal submissions)
  if (file.size > 10 * 1024 * 1024) {
    return NextResponse.json({ error: 'Draft file exceeds 10 MB limit' }, { status: 400 })
  }

  try {
    const buffer = Buffer.from(await file.arrayBuffer())
    const feedback = await getFeedback(buffer, assignment)
    return NextResponse.json({ ok: true, feedback })
  } catch (err) {
    console.error('[/api/feedback] Gemini feedback error:', err)
    return NextResponse.json(
      { error: 'AI feedback failed', detail: String(err) },
      { status: 502 }
    )
  }
}
