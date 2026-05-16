/**
 * lib/storage.ts
 *
 * Abstraction for submission file storage.
 * - Development (no BLOB_READ_WRITE_TOKEN): writes to local uploads/ directory.
 * - Production (BLOB_READ_WRITE_TOKEN set):  uploads to Vercel Blob.
 *
 * Files are stored with opaque UUID-based paths so URLs are not guessable.
 */

import { put } from '@vercel/blob'
import { writeFile, mkdir, readFile } from 'fs/promises'
import path from 'path'

function blobEnabled(): boolean {
  return !!process.env.BLOB_READ_WRITE_TOKEN
}

/**
 * Persist a submission PDF.
 * Returns a local filesystem path (dev) or a Vercel Blob URL (production).
 */
export async function storeFile(
  buffer: Buffer,
  key: string,
  filename: string
): Promise<string> {
  if (blobEnabled()) {
    const { url } = await put(`submissions/${key}/${filename}`, buffer, {
      access: 'private',
      contentType: 'application/pdf',
      addRandomSuffix: false,
      allowOverwrite: true,
    })
    return url
  }

  const dir = path.join(process.cwd(), 'uploads', key)
  await mkdir(dir, { recursive: true })
  const filePath = path.join(dir, filename)
  await writeFile(filePath, buffer)
  return filePath
}

/**
 * Read a stored file into a Buffer.
 * Accepts either a local filesystem path or an https:// URL (Vercel Blob).
 */
export async function getFileBuffer(pathOrUrl: string): Promise<Buffer> {
  if (pathOrUrl.startsWith('http://') || pathOrUrl.startsWith('https://')) {
    const res = await fetch(pathOrUrl)
    if (!res.ok) throw new Error(`Failed to fetch stored file: ${res.status}`)
    return Buffer.from(await res.arrayBuffer())
  }
  return readFile(pathOrUrl)
}
