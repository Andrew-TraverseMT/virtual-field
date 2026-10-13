import Link from 'next/link'
import { redirect } from 'next/navigation'
import { getServerSession } from 'next-auth/next'
import { authOptions } from '@/lib/auth'
import { sql } from '@/lib/db'
import { readGradesPosted } from '@/lib/research'
import { gateConsentList } from '@/lib/study-access'
import { homeForRole, sessionRole } from '@/lib/session'
import GradesReleaseButton from '@/app/study/GradesReleaseButton'
import ConsentTools from './ConsentTools'

export default async function ConsentPage() {
  const session = await getServerSession(authOptions)
  const role = sessionRole(session)
  if (!session) redirect('/login')
  if (role !== 'consent_holder') redirect(homeForRole(role))

  const gradesPosted = await readGradesPosted()
  const gated = await gateConsentList(role, gradesPosted, async () => {
    const { rows } = await sql`SELECT COUNT(*)::int AS n FROM consent_records`
    return Number((rows[0] as { n?: number } | undefined)?.n ?? 0)
  })

  return (
    <div className="mx-auto w-full max-w-3xl px-4 sm:px-6 py-10">
      <p className="text-xs font-semibold uppercase tracking-widest text-stone-400 mb-1">Consent holder</p>
      <h1 className="text-2xl font-semibold tracking-tight text-stone-900">Encrypted consent</h1>
      <p className="mt-2 mb-8 text-sm leading-relaxed text-stone-500">
        Records are ciphertext for your public key. This page does not decrypt them. The instructor cannot open this page or the export.
        Export stays available only until grades are marked posted. Purge deletes the ciphertext and is written to the audit log.
      </p>
      {gated.allowed ? (
        <p className="mb-6 text-sm text-stone-700">Encrypted records stored: {gated.rows}</p>
      ) : (
        <p className="mb-6 text-sm text-stone-600">
          Grades are marked posted, so the export is closed. You can still purge any ciphertext that remains.
        </p>
      )}
      <ConsentTools canExport={gated.allowed} />
      <div className="mb-8">
        <GradesReleaseButton gradesPosted={gradesPosted} />
      </div>
      <Link href="/study" className="inline-block text-sm font-medium text-amber-700">
        Survey totals
      </Link>
    </div>
  )
}
