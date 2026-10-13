import studyConfig from '@/data/study.json'

export type StudyConfig = {
  note: string
  version: string
  metrics: {
    endpoint: string
    /** Labeled example only. The app does not request this URL. */
    placeholderEndpoint: string
  }
}

export const study: StudyConfig = studyConfig

const UNCONFIGURED_HOSTS = new Set([
  'example',
  'example.com',
  'example.edu',
  'example.org',
  'example.invalid',
  'placeholder',
  'placeholder.example',
  'localhost',
])

/** True only for an https URL an instructor has actually set. */
export function isConfiguredHttpsUrl(value: string): boolean {
  const trimmed = value.trim()
  if (!trimmed) return false
  if (/[<>]|\bTODO\b|\bPLACEHOLDER\b|\bREPLACE_WITH\b/i.test(trimmed)) return false

  let url: URL
  try {
    url = new URL(trimmed)
  } catch {
    return false
  }

  if (url.protocol !== 'https:') return false
  if (url.username || url.password) return false

  const host = url.hostname.toLowerCase()
  if (UNCONFIGURED_HOSTS.has(host)) return false
  if (
    host.endsWith('.example') ||
    host.endsWith('.invalid') ||
    host.endsWith('.localhost')
  ) {
    return false
  }
  if (host.includes('placeholder')) return false
  return true
}

/** Aggregate collector URL, or null when metrics stay off. */
export function metricsEndpoint(): string | null {
  const endpoint = study.metrics.endpoint
  if (!isConfiguredHttpsUrl(endpoint)) return null
  return new URL(endpoint.trim()).toString()
}

export function studyVersion(): string {
  return study.version.trim()
}
