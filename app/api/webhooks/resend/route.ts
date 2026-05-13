import { NextRequest, NextResponse } from 'next/server'
import { sql } from '@/lib/db'

/**
 * Resend webhook endpoint.
 * Listens for email bounce/complaint events and marks the user in the database.
 *
 * To enable: configure this URL in the Resend dashboard → Webhooks.
 * Recommended: add Svix signature verification (see SETUP.md).
 */
export async function POST(req: NextRequest) {
  let body: unknown
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON.' }, { status: 400 })
  }

  const event = body as {
    type?: string
    data?: { email_id?: string; to?: string[] }
  }

  // Handle email bounce events
  if (event.type === 'email.bounced' || event.type === 'email.complained') {
    const email = event.data?.to?.[0]
    if (email) {
      await sql`UPDATE registered_users SET email_bounced = 1 WHERE email = ${email.toLowerCase()}`
    }
  }

  return NextResponse.json({ received: true })
}
