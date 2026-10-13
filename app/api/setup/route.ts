import { NextRequest, NextResponse } from 'next/server'
import { randomBytes } from 'crypto'
import bcrypt from 'bcryptjs'
import { initSchema, sql } from '@/lib/db'

const BLOCKED_PASSWORDS = new Set([
  'test1234',
  'instructor1234',
  'password',
  'password1234',
])

function authorized(req: NextRequest): boolean {
  const secret = req.headers.get('authorization')?.replace('Bearer ', '')
  return Boolean(secret && secret === process.env.CRON_SECRET)
}

/**
 * Initialize the schema. Optionally create the first instructor when none exists.
 *
 *   curl -X POST https://your-app.vercel.app/api/setup \
 *        -H "Authorization: Bearer <CRON_SECRET>" \
 *        -H "Content-Type: application/json" \
 *        -d '{"name":"Andrew Laskowski","email":"andrew@example.edu","password":"<at least 12 characters>"}'
 *
 * Omit the JSON body to initialize the schema only.
 */
export async function POST(req: NextRequest) {
  if (!authorized(req)) {
    return NextResponse.json({ error: 'Unauthorized.' }, { status: 401 })
  }

  await initSchema()

  const contentType = req.headers.get('content-type') ?? ''
  if (!contentType.includes('application/json')) {
    return NextResponse.json({ ok: true, message: 'Schema initialized.' })
  }

  let body: { name?: string; email?: string; password?: string } = {}
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ ok: true, message: 'Schema initialized.' })
  }

  if (!body.email && !body.password && !body.name) {
    return NextResponse.json({ ok: true, message: 'Schema initialized.' })
  }

  const name = body.name?.trim() ?? ''
  const email = body.email?.trim().toLowerCase() ?? ''
  const password = body.password ?? ''
  if (!name || !email || !email.includes('@') || password.length < 12) {
    return NextResponse.json(
      { error: 'Name, email, and a password of at least 12 characters are required.' },
      { status: 400 },
    )
  }
  if (BLOCKED_PASSWORDS.has(password.toLowerCase())) {
    return NextResponse.json({ error: 'Choose a password that is not a known demo password.' }, { status: 400 })
  }

  const { rows } = await sql`
    SELECT COUNT(*)::int AS n FROM registered_users WHERE role = 'instructor'
  `
  const existing = Number((rows[0] as { n?: number } | undefined)?.n ?? 0)
  if (existing > 0) {
    return NextResponse.json(
      { error: 'An instructor account already exists. Create further accounts from the roster.' },
      { status: 409 },
    )
  }

  const id = `user-${randomBytes(8).toString('hex')}`
  const passwordHash = await bcrypt.hash(password, 12)
  const now = Math.floor(Date.now() / 1000)
  await sql`
    INSERT INTO registered_users (id, name, email, password_hash, role, verified, created_at)
    VALUES (${id}, ${name}, ${email}, ${passwordHash}, 'instructor', 1, ${now})
  `

  return NextResponse.json({ ok: true, message: 'Schema initialized and the first instructor was created.' })
}
