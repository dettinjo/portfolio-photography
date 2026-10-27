// One delivered photo: /api/portal/download/<photoId>/<original|web>
import { type NextRequest } from 'next/server'
import { createReadStream } from 'fs'
import { stat } from 'fs/promises'
import path from 'path'
import { Readable } from 'stream'
import { getPayloadClient } from '@/lib/payload'
import { projectViewer } from '@/lib/project-access'
import { deliveryOpen } from '@/lib/delivery'
import { findPhotoDir, originalFileName } from '@/lib/sync/process'
import { attachment, webName } from '@/lib/download'

type Params = { params: Promise<{ id: string; variant: string }> }
const notFound = () => new Response('Not found', { status: 404, headers: { 'Cache-Control': 'no-store' } })

export async function GET(req: NextRequest, { params }: Params) {
  const { id, variant } = await params
  if (!/^\d{1,12}$/.test(id) || !['original', 'web'].includes(variant)) return notFound()

  const payload = await getPayloadClient()
  const photo = await payload.findByID({ collection: 'photos', id: Number(id), depth: 0, overrideAccess: true }).catch(() => null)
  if (!photo || photo.purpose !== 'final' || photo.status !== 'ready' || !photo.project || !photo.version) return notFound()
  const projectId = typeof photo.project === 'object' ? photo.project.id : photo.project
  const viewer = await projectViewer(req, projectId)
  if (!viewer) return notFound()
  const project = await payload.findByID({ collection: 'projects', id: projectId, depth: 0, overrideAccess: true })
  if (!viewer.admin && !deliveryOpen(project)) return notFound()

  const dir = findPhotoDir(photo.ncFileId, photo.version, 'finals')
  if (!dir) return notFound()
  const file = path.join(dir, variant === 'web' ? 'web.jpg' : originalFileName(photo.filename))
  const info = await stat(file).catch(() => null)
  if (!info) return notFound()

  return new Response(Readable.toWeb(createReadStream(file)) as ReadableStream, {
    headers: {
      'Content-Type': variant === 'web' || /\.jpe?g$/i.test(photo.filename) ? 'image/jpeg' : 'application/octet-stream',
      'Content-Length': String(info.size),
      'Content-Disposition': attachment(variant === 'web' ? webName(photo.filename) : photo.filename),
      'Cache-Control': 'private, no-store',
    },
  })
}
