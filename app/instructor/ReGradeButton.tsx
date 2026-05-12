'use client'

import { useState } from 'react'

type Props = {
  submissionId: string
  onComplete?: () => void
}

export default function ReGradeButton({ submissionId }: Props) {
  const [state, setState] = useState<'idle' | 'loading' | 'done' | 'error'>('idle')

  async function handleClick() {
    setState('loading')
    try {
      const res = await fetch('/api/grade', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ submissionId }),
      })
      if (res.ok) {
        setState('done')
        // Reload to show updated status
        setTimeout(() => window.location.reload(), 800)
      } else {
        setState('error')
      }
    } catch {
      setState('error')
    }
  }

  return (
    <button
      onClick={handleClick}
      disabled={state === 'loading' || state === 'done'}
      className="w-full rounded-xl bg-violet-50 px-3 py-2 text-xs font-semibold text-violet-700 ring-1 ring-violet-200 hover:bg-violet-100 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
    >
      {state === 'loading' && 'Grading…'}
      {state === 'done' && 'Done — reloading'}
      {state === 'error' && 'Error — try again'}
      {state === 'idle' && 'Run AI Grade'}
    </button>
  )
}
