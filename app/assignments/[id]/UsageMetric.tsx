'use client'

import { useEffect } from 'react'

/**
 * Reports one aggregate exercise-open event.
 * The request body is the exercise number only. No cookie is sent.
 */
export default function UsageMetric({ exercise }: { exercise: number }) {
  useEffect(() => {
    fetch('/api/usage', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ exercise }),
      credentials: 'omit',
      cache: 'no-store',
      keepalive: true,
    }).catch(() => {
      // Aggregate counts are best-effort and stay out of the exercise flow.
    })
  }, [exercise])

  return null
}
