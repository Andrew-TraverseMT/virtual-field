import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth/next'
import { authOptions } from '@/lib/auth'
import { sql } from '@/lib/db'

export const runtime = 'nodejs'

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getServerSession(authOptions)
  const role = (session?.user as { role?: string })?.role
  if (role !== 'instructor') {
    return new NextResponse('Forbidden', { status: 403 })
  }

  const { id } = await params
  const { rows } = await sql`SELECT file_url, file_name FROM submissions WHERE id = ${id}`
  const sub = rows[0] as { file_url: string | null; file_name: string | null } | undefined

  if (!sub?.file_url) {
    return new NextResponse('No file available for this submission', { status: 404 })
  }

  const token = process.env.BLOB_READ_WRITE_TOKEN
  const res = await fetch(sub.file_url, {
    headers: token ? { Authorization: `Bearer ${token}` } : {},
  })

  if (!res.ok) {
    return new NextResponse(`Failed to fetch file: ${res.status}`, { status: 502 })
  }

  const buffer = await res.arrayBuffer()
  const safeName = sub.file_name ?? 'submission.pdf'

  return new NextResponse(buffer, {
    headers: {
      'Content-Type': 'application/pdf',
      'Content-Disposition': `attachment; filename="${safeName}"`,
      'Cache-Control': 'private, no-store',
    },
  })
}
