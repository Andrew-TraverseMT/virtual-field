import { redirect } from 'next/navigation'

export default function RegisterPage() {
  redirect('/login')
}
  const [sent, setSent] = useState(false)
  const [loading, setLoading] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    setLoading(true)

    const res = await fetch('/api/auth/register', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name, email, password }),
    })

    const data = await res.json()
    setLoading(false)

    if (!res.ok) {
      setError(data.error ?? 'Registration failed.')
    } else {
      setSent(true)
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-[#f8f7f4] px-4">
      <div className="w-full max-w-sm">

        {/* Logo mark */}
        <div className="mb-8 flex flex-col items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-amber-700 text-white font-bold text-lg select-none">
            B
          </div>
          <div className="text-center">
            <h1 className="text-lg font-semibold tracking-tight text-stone-900">Create an account</h1>
            <p className="text-sm text-stone-400">Montana University @montana.edu only</p>
          </div>
        </div>

        <div className="rounded-2xl border border-stone-200 bg-white p-8 shadow-sm">
          {sent ? (
            <div className="text-center space-y-3">
              <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-emerald-50 text-emerald-600 text-xl">
                ✓
              </div>
              <h2 className="font-semibold text-stone-900">Check your email</h2>
              <p className="text-sm text-stone-500 leading-relaxed">
                We sent a verification link to <span className="font-medium text-stone-700">{email}</span>.
                Click the link to activate your account.
              </p>
              <Link href="/login" className="mt-2 inline-block text-sm font-medium text-amber-700 hover:text-amber-800">
                Back to login
              </Link>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="mb-1.5 block text-xs font-semibold uppercase tracking-widest text-stone-400">
                  Full Name
                </label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  required
                  autoComplete="name"
                  placeholder="Jane Smith"
                  className="w-full rounded-lg border border-stone-200 bg-stone-50 px-3.5 py-2.5 text-sm text-stone-900 placeholder:text-stone-300 focus:border-amber-500 focus:bg-white focus:outline-none focus:ring-2 focus:ring-amber-100"
                />
              </div>

              <div>
                <label className="mb-1.5 block text-xs font-semibold uppercase tracking-widest text-stone-400">
                  Montana Email
                </label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  autoComplete="email"
                  placeholder="you@montana.edu"
                  className="w-full rounded-lg border border-stone-200 bg-stone-50 px-3.5 py-2.5 text-sm text-stone-900 placeholder:text-stone-300 focus:border-amber-500 focus:bg-white focus:outline-none focus:ring-2 focus:ring-amber-100"
                />
              </div>

              <div>
                <label className="mb-1.5 block text-xs font-semibold uppercase tracking-widest text-stone-400">
                  Password
                </label>
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  autoComplete="new-password"
                  placeholder="At least 8 characters"
                  className="w-full rounded-lg border border-stone-200 bg-stone-50 px-3.5 py-2.5 text-sm text-stone-900 placeholder:text-stone-300 focus:border-amber-500 focus:bg-white focus:outline-none focus:ring-2 focus:ring-amber-100"
                />
              </div>

              {error && (
                <p className="rounded-xl border border-red-100 bg-red-50 px-4 py-3 text-sm text-red-600">
                  {error}
                </p>
              )}

              <button
                type="submit"
                disabled={loading}
                className="w-full rounded-xl bg-amber-700 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-amber-800 active:scale-[0.98] disabled:opacity-60"
              >
                {loading ? 'Sending…' : 'Create account'}
              </button>
            </form>
          )}
        </div>

        <p className="mt-6 text-center text-sm text-stone-400">
          Already have an account?{' '}
          <Link href="/login" className="font-medium text-amber-700 hover:text-amber-800">
            Sign in
          </Link>
        </p>
      </div>
    </div>
  )
}
