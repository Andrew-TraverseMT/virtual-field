import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

// Route protection is handled inside the app's server components and API routes.
// Keeping auth redirects out of the edge proxy avoids token/session mismatches
// that can produce redirect loops in production. This only forwards the path
// so the root layout can send a signed-in user to the password page.
export function proxy(request: NextRequest) {
  const requestHeaders = new Headers(request.headers)
  requestHeaders.set('x-pathname', request.nextUrl.pathname)
  return NextResponse.next({
    request: {
      headers: requestHeaders,
    },
  })
}
