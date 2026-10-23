import Link from 'next/link'
import { redirect } from 'next/navigation'
import { getServerSession } from 'next-auth/next'
import { authOptions } from '@/lib/auth'
import { readConsentEncryptionKey } from '@/lib/consent-crypto'
import { readGradesPosted, viewConsentRecords } from '@/lib/research'
import { homeForRole, mustChangePassword, sessionRole, sessionUserId } from '@/lib/session'
import ConsentTools from './ConsentTools'

export default async function ConsentPage() {
  const session = await getServerSession(authOptions)
  const role = sessionRole(session)
  if (!session) redirect('/login')
  if (mustChangePassword(session)) redirect('/account/password')
  if (role !== 'researcher') redirect(homeForRole(role))

  const actorId = sessionUserId(session)
  if (!actorId) redirect('/login')

  const key = readConsentEncryptionKey()
  const gradesPosted = await readGradesPosted()
  const view = key ? await viewConsentRecords(role, actorId, key) : { allowed: false as const, gradesPosted }

  return (
    <div className="mx-auto w-full max-w-3xl px-4 sm:px-6 py-10">
      <p className="text-xs font-semibold uppercase tracking-widest text-stone-400 mb-1">Researcher</p>
      <h1 className="text-2xl font-semibold tracking-tight text-stone-900">Consent records</h1>
      <p className="mt-2 mb-8 text-sm leading-relaxed text-stone-500">
        Consent is encrypted at rest with the server key. This page decrypts it for the researcher role only.
        Instructors and students cannot open it. View and export close when grades are marked posted. Purge stays available and is written to the audit log.
      </p>
      {!key && (
        <p className="mb-6 text-sm text-stone-600">
          Consent cannot be collected or read until CONSENT_ENCRYPTION_KEY is configured.
        </p>
      )}
      {key && gradesPosted && (
        <p className="mb-6 text-sm text-stone-600">
          Grades are marked posted, so view and export are closed. You can still purge consent records and survey responses.
        </p>
      )}
      {view.allowed && (
        view.records.length === 0 ? (
          <p className="mb-6 text-sm text-stone-700">No consent records are stored.</p>
        ) : (
          <div className="mb-8 overflow-x-auto rounded-2xl border border-stone-200 bg-white shadow-sm">
            <table className="w-full min-w-[640px] text-sm">
              <thead>
                <tr className="border-b border-stone-100 text-left text-xs font-semibold uppercase tracking-widest text-stone-400">
                  <th className="px-4 py-3">Name</th>
                  <th className="px-4 py-3">Email</th>
                  <th className="px-4 py-3">Decision</th>
                  <th className="px-4 py-3">Linking code</th>
                  <th className="px-4 py-3">Stored</th>
                </tr>
              </thead>
              <tbody>
                {view.records.map((record) => (
                  <tr key={record.id} className="border-b border-stone-100 last:border-0">
                    <td className="px-4 py-3 text-stone-800">{record.name}</td>
                    <td className="px-4 py-3 text-stone-600">{record.email}</td>
                    <td className="px-4 py-3 text-stone-600">{record.decision}</td>
                    <td className="px-4 py-3 font-mono text-stone-700">{record.participantCode}</td>
                    <td className="px-4 py-3 text-stone-500">
                      {new Date(record.createdAt * 1000).toLocaleDateString('en-US', {
                        month: 'short',
                        day: 'numeric',
                        year: 'numeric',
                      })}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )
      )}
      <ConsentTools canExport={view.allowed} />
      <Link href="/study" className="inline-block text-sm font-medium text-amber-700">
        Survey totals
      </Link>
    </div>
  )
}
