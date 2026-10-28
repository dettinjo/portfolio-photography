// Guest view of a delivered photo: /api/share/<token>/<photoId>/<width|download>.
// A number serves the WebP at that width (capped); "download" the web-size JPEG
// when the link allows downloads. Wrong or dead links get a plain 404.
import { type NextRequest } from 'next/server'
import { createReadStream } from 'fs'
import { readdir, readFile, stat } from 'fs/promises'
import path from 'path'
import { Readable } from 'stream'
import { getPayloadClient } from '@/lib/payload'
import { findPhotoDir } from '@/lib/sync/process'
import { attachment, webName } from '@/lib/download'
import { GUEST_MAX_WIDTH, resolveShare } from '@/lib/share'

type Params = { params: Promise<{ token: string; id: string; width: string }> }
const notFound = () => new Response('Not found', { status: 404, headers: { 'Cache-Control': 'no-store' } })

export async function GET(_req: NextRequest, { params }: Params) {
  const { token, id, width } = await params
  if (!/^\d{1,12}$/.test(id) || !(width === 'download' || /^\d{1,5}$/.test(width))) return notFound()
  const payload = await getPayloadClient()
  const share = await resolveShare(payload, token)
  if (!share) return notFound()
  const photo = await payload.findByID({ collection: 'photos', id: Number(id), depth: 0, overrideAccess: true }).catch(() => null)
  const projectId = photo && (typeof photo.project === 'object' ? photo.project?.id : photo.project)
  if (!photo || photo.purpose !== 'final' || photo.status !== 'ready' || !photo.version || projectId !== share.project.id) return notFound()
  const dir = findPhotoDir(photo.ncFileId, photo.version, 'finals')
  if (!dir) return notFound()

  if (width === 'download') {
    if (!share.canDownload) return notFound()
    const file = path.join(dir, 'web.jpg')
    const info = await stat(file).catch(() => null)
    if (!info) return notFound()
    return new Response(Readable.toWeb(createReadStream(file)) as ReadableStream, {
      headers: {
        'Content-Type': 'image/jpeg',
        'Content-Length': String(info.size),
        'Content-Disposition': attachment(webName(photo.filename)),
        'Cache-Control': 'private, no-store',
      },
    })
  }

  const cap = share.locked ? 960 : GUEST_MAX_WIDTH
  const available = (await readdir(dir).catch(() => [] as string[]))
    .filter((f) => f.endsWith('.webp'))
    .map((f) => Number(f.slice(0, -5)))
    .sort((a, b) => a - b)
  const allowed = available.filter((a) => a <= cap)
  const requested = Math.min(Number(width), cap)
  const w = allowed.find((a) => a >= requested) ?? allowed[allowed.length - 1] ?? available[0]
  if (!w) return notFound()
  return new Response(new Uint8Array(await readFile(`${dir}/${w}.webp`)), {
    headers: {
      'Content-Type': 'image/webp',
      // Revoking a link must take effect: no long-lived copies
      'Cache-Control': 'private, max-age=600',
      'X-Robots-Tag': 'noindex',
    },
  })
}
