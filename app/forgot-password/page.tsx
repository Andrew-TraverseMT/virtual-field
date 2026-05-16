import { redirect } from 'next/navigation'

export default function ForgotPasswordPage() {
  redirect('/login')
}

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setStatus('loading')
    setError('')

    try {
      const res = await fetch('/api/auth/forgot-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      })
      const data = await res.json()
      if (!res.ok) {
        setError(data.error ?? 'Something went wrong.')
        setStatus('error')
      } else {
        setStatus('sent')
      }
    } catch {
      setError('Network error. Please try again.')
      setStatus('error')
    }
  }

  return (
    <main className="min-h-screen flex items-center justify-center px-4"
      style={{ backgroundColor: '#f8f7f4' }}>
      <div className="w-full max-w-sm">
        <h1 className="text-2xl font-bold tracking-tight text-stone-800 mb-1">
          Forgot password
        </h1>
        <p className="text-sm text-stone-500 mb-8">
          Enter your @montana.edu email and we&apos;ll send a reset link.
        </p>

        {status === 'sent' ? (
          <div className="rounded-2xl border border-stone-200 bg-white shadow-sm p-6 text-center">
            <p className="text-sm text-stone-700 mb-4">
              If that email is registered, a reset link is on its way. Check your inbox.
            </p>
            <Link href="/login"
              className="text-sm font-medium text-amber-700 hover:text-amber-800">
              Back to sign in
            </Link>
          </div>
        ) : (
          <form onSubmit={handleSubmit}
            className="rounded-2xl border border-stone-200 bg-white shadow-sm p-6 space-y-4">
            {error && (
              <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">
                {error}
              </p>
            )}

            <div className="space-y-1">
              <label htmlFor="email"
                className="text-xs font-semibold uppercase tracking-widest text-stone-400">
                Montana email
              </label>
              <input
                id="email"
                type="email"
                required
                value={email}
                onChange={e => setEmail(e.target.value)}
                placeholder="netid@montana.edu"
                className="w-full rounded-lg border border-stone-200 bg-stone-50 px-3 py-2
                           text-sm text-stone-800 placeholder:text-stone-400
                           focus:outline-none focus:ring-2 focus:ring-amber-600/30 focus:border-amber-600"
              />
            </div>

            <button
              type="submit"
              disabled={status === 'loading'}
              className="w-full rounded-lg bg-amber-700 px-4 py-2 text-sm font-semibold
                         text-white hover:bg-amber-800 disabled:opacity-50 transition-colors">
              {status === 'loading' ? 'Sending…' : 'Send reset link'}
            </button>

            <p className="text-center text-sm text-stone-400">
              <Link href="/login"
                className="text-amber-700 hover:text-amber-800 font-medium">
                Back to sign in
              </Link>
            </p>
          </form>
        )}
      </div>
    </main>
  )
}
