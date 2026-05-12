import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth/next'
import { authOptions } from '@/lib/auth'
import { readFile } from 'fs/promises'
import path from 'path'

type Params = { params: Promise<{ filename: string }> }

const ALLOWED_EXTENSIONS = new Set(['.pdf', '.png', '.jpg', '.jpeg'])

export async function GET(request: NextRequest, { params }: Params) {
  const session = await getServerSession(authOptions)
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { filename } = await params

  // Sanitize: reject path traversal attempts
  if (filename.includes('..') || filename.includes('/') || filename.includes('\\')) {
    return NextResponse.json({ error: 'Invalid filename' }, { status: 400 })
  }

  const ext = path.extname(filename).toLowerCase()
  if (!ALLOWED_EXTENSIONS.has(ext)) {
    return NextResponse.json({ error: 'File type not allowed' }, { status: 400 })
  }

  const filePath = path.join(process.cwd(), 'materials', filename)

  let buffer: Buffer
  try {
    buffer = await readFile(filePath)
  } catch {
    return NextResponse.json({ error: 'File not found' }, { status: 404 })
  }

  const contentTypes: Record<string, string> = {
    '.pdf': 'application/pdf',
    '.png': 'image/png',
    '.jpg': 'image/jpeg',
    '.jpeg': 'image/jpeg',
  }

  const stream = new ReadableStream({
    start(controller) {
      controller.enqueue(buffer)
      controller.close()
    },
  })

  return new NextResponse(stream, {
    headers: {
      'Content-Type': contentTypes[ext] ?? 'application/octet-stream',
      'Content-Disposition': `inline; filename="${filename}"`,
      'Cache-Control': 'private, max-age=3600',
    },
  })
}
