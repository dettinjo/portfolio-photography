// Serves watermarked client previews: /api/previews/<photoId>/<version>/<width>
// Only to the clients of the photo's project and to signed-in admins. Kept
// apart from /api/photos, which is public.
import { type NextRequest } from 'next/server'
import { readdir, readFile } from 'fs/promises'
import { getPayloadClient } from '@/lib/payload'
import { getClient } from '@/lib/client-session'
import { findPhotoDir } from '@/lib/sync/process'

type Params = { params: Promise<{ id: string; version: string; width: string }> }

const notFound = () => new Response('Not found', { status: 404, headers: { 'Cache-Control': 'no-store' } })

export async function GET(req: NextRequest, { params }: Params) {
  const { id, version, width } = await params
  if (!/^\d{1,12}$/.test(id) || !/^[a-z0-9]{1,48}$/.test(version) || !/^\d{1,5}$/.test(width)) return notFound()

  const payload = await getPayloadClient()
  const photo = await payload.findByID({ collection: 'photos', id: Number(id), depth: 0, overrideAccess: true }).catch(() => null)
  if (!photo || photo.purpose !== 'preview' || photo.status !== 'ready' || photo.version !== version || !photo.project) {
    return notFound()
  }
  const projectId = typeof photo.project === 'object' ? photo.project.id : photo.project

  // Access: an admin, or a client of this project. Unauthorised requests get
  // the same 404 as missing ones, so ids cannot be probed.
  const { user } = await payload.auth({ headers: req.headers }).catch(() => ({ user: null }))
  if (!user) {
    const client = await getClient()
    if (!client) return notFound()
    const allowed = await payload.count({
      collection: 'projects',
      where: { and: [{ id: { equals: projectId } }, { clients: { in: [client.id] } }] },
      overrideAccess: true,
    })
    if (!allowed.totalDocs) return notFound()
  }

  const dir = findPhotoDir(photo.ncFileId, version, 'previews')
  if (!dir) return notFound()
  const available = (await readdir(dir).catch(() => [] as string[]))
    .filter((f) => f.endsWith('.webp'))
    .map((f) => Number(f.slice(0, -5)))
    .sort((a, b) => a - b)
  if (!available.length) return notFound()
  const requested = Number(width)
  const w = available.find((a) => a >= requested) ?? available[available.length - 1]

  return new Response(new Uint8Array(await readFile(`${dir}/${w}.webp`)), {
    headers: {
      'Content-Type': 'image/webp',
      // Private: browsers may keep it, shared caches must not
      'Cache-Control': 'private, max-age=86400',
      'X-Robots-Tag': 'noindex',
    },
  })
}
