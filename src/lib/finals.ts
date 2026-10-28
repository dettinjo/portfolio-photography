// The delivered files of a project on disk, and a ZIP of them streamed while
// it is built (no temp files). JPEGs are already compressed, so the ZIP only
// stores them (fast, ZIP64 for large weddings).
import 'server-only'
import { existsSync } from 'fs'
import path from 'path'
import { PassThrough, Readable } from 'stream'
import archiver from 'archiver'
import type { Payload } from 'payload'
import { findPhotoDir, originalFileName } from '@/lib/sync/process'
import { webName } from '@/lib/download'

export type Variant = 'original' | 'web'
export interface FinalFile {
  file: string
  name: string
}

export async function finalFiles(payload: Payload, projectId: number, variant: Variant): Promise<FinalFile[]> {
  const finals = await payload.find({
    collection: 'photos',
    where: { and: [{ project: { equals: projectId } }, { purpose: { equals: 'final' } }, { status: { equals: 'ready' } }] },
    sort: ['order', 'filename'],
    limit: 0,
    pagination: false,
    depth: 0,
    overrideAccess: true,
  })
  return finals.docs
    .map((p) => {
      const dir = p.version ? findPhotoDir(p.ncFileId, p.version, 'finals') : null
      const file = dir && path.join(dir, variant === 'web' ? 'web.jpg' : originalFileName(p.filename))
      return file && existsSync(file) ? { file, name: variant === 'web' ? webName(p.filename) : p.filename } : null
    })
    .filter((f): f is FinalFile => f !== null)
}

/** A ZIP of the files as a web stream; duplicate names get a -2, -3 … suffix. */
export function zipStream(files: FinalFile[]): ReadableStream {
  const zip = archiver('zip', { store: true })
  const out = new PassThrough()
  zip.on('error', (err) => out.destroy(err))
  zip.pipe(out)
  const used = new Set<string>()
  for (const f of files) {
    let name = f.name
    for (let i = 2; used.has(name); i++) name = f.name.replace(/(\.[^.]+)?$/, `-${i}$1`)
    used.add(name)
    zip.file(f.file, { name })
  }
  void zip.finalize()
  return Readable.toWeb(out) as ReadableStream
}
