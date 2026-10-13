import { readFileSync } from 'node:fs'
import { decryptConsentPayload, type ConsentEnvelope } from '../lib/consent-crypto.ts'

function argument(name: string): string | undefined {
  const index = process.argv.indexOf(name)
  return index >= 0 ? process.argv[index + 1] : undefined
}

const bundlePath = argument('--bundle')
const keyPath = argument('--private-key')
if (!bundlePath || !keyPath) {
  console.error(
    'Usage: node --experimental-strip-types scripts/decrypt-consent.ts --bundle consent-export.json --private-key /path/to/private.pem',
  )
  process.exit(1)
}

const bundle = JSON.parse(readFileSync(bundlePath, 'utf8')) as {
  records?: { createdAt?: number; envelope: ConsentEnvelope }[]
}
const privatePem = readFileSync(keyPath, 'utf8')
const lines = ['created_at,decision,participant_code,name,email']

for (const record of bundle.records ?? []) {
  const payload = decryptConsentPayload(privatePem, record.envelope) as {
    at?: number
    decision?: string
    participantCode?: string
    name?: string
    email?: string
  }
  const cells = [
    String(payload.at ?? record.createdAt ?? ''),
    payload.decision ?? '',
    payload.participantCode ?? '',
    payload.name ?? '',
    payload.email ?? '',
  ].map((value) => `"${value.replaceAll('"', '""')}"`)
  lines.push(cells.join(','))
}

process.stdout.write(`${lines.join('\n')}\n`)
