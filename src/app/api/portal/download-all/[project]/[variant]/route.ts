// All delivered photos as one ZIP, streamed while it is built (no temp files):
// /api/portal/download-all/<project slug>/<original|web>. JPEGs are already
// compressed, so the ZIP only stores them (fast, ZIP64 for large weddings).
import { type NextRequest } from 'next/server'
import { existsSync } from 'fs'
import path from 'path'
import { PassThrough, Readable } from 'stream'
import archiver from 'archiver'
import { getPayloadClient } from '@/lib/payload'
import { projectViewer } from '@/lib/project-access'
import { deliveryOpen } from '@/lib/delivery'
import { findPhotoDir, originalFileName } from '@/lib/sync/process'
import { attachment, webName } from '@/lib/download'

type Params = { params: Promise<{ project: string; variant: string }> }
const notFound = () => new Response('Not found', { status: 404, headers: { 'Cache-Control': 'no-store' } })

export async function GET(req: NextRequest, { params }: Params) {
  const { project: slug, variant } = await params
  if (!/^[a-z0-9-]{1,120}$/.test(slug) || !['original', 'web'].includes(variant)) return notFound()

  const payload = await getPayloadClient()
  const found = await payload.find({ collection: 'projects', where: { slug: { equals: slug } }, limit: 1, depth: 0, overrideAccess: true })
  const project = found.docs[0]
  if (!project) return notFound()
  const viewer = await projectViewer(req, project.id)
  if (!viewer || (!viewer.admin && !deliveryOpen(project))) return notFound()

  const finals = await payload.find({
    collection: 'photos',
    where: { and: [{ project: { equals: project.id } }, { purpose: { equals: 'final' } }, { status: { equals: 'ready' } }] },
    sort: ['order', 'filename'],
    limit: 0,
    pagination: false,
    depth: 0,
    overrideAccess: true,
  })
  const files = finals.docs
    .map((p) => {
      const dir = p.version ? findPhotoDir(p.ncFileId, p.version, 'finals') : null
      const file = dir && path.join(dir, variant === 'web' ? 'web.jpg' : originalFileName(p.filename))
      return file && existsSync(file) ? { file, name: variant === 'web' ? webName(p.filename) : p.filename } : null
    })
    .filter((f): f is { file: string; name: string } => f !== null)
  if (!files.length) return notFound()

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

  if (viewer.client) {
    await payload.create({
      collection: 'activity',
      data: { project: project.id, actor: 'client', client: viewer.client.id, verb: 'note', message: `${viewer.client.name} downloaded all photos (${variant}, ${files.length} files)` },
      overrideAccess: true,
    })
  }

  return new Response(Readable.toWeb(out) as ReadableStream, {
    headers: {
      'Content-Type': 'application/zip',
      'Content-Disposition': attachment(`${slug}${variant === 'web' ? '-web' : ''}.zip`),
      'Cache-Control': 'private, no-store',
    },
  })
}
