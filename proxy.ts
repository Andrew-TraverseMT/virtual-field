import { NextResponse } from 'next/server'

// Route protection is handled inside the app's server components and API routes.
// Keeping auth redirects out of the edge proxy avoids token/session mismatches
// that can produce redirect loops in production.
export function proxy() {
  return NextResponse.next()
}
