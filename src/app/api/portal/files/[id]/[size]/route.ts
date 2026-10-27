// A project file for the project's clients and admins: /api/portal/files/<id>/<thumb|full>
import { type NextRequest } from 'next/server'
import { readFile } from 'fs/promises'
import path from 'path'
import { getPayloadClient } from '@/lib/payload'
import { getClient } from '@/lib/client-session'
import { PROJECT_FILES_DIR } from '@/payload/collections/ProjectFiles'

type Params = { params: Promise<{ id: string; size: string }> }
const notFound = () => new Response('Not found', { status: 404, headers: { 'Cache-Control': 'no-store' } })

export async function GET(req: NextRequest, { params }: Params) {
  const { id, size } = await params
  if (!/^\d{1,12}$/.test(id) || !['thumb', 'full'].includes(size)) return notFound()

  const payload = await getPayloadClient()
  const doc = await payload.findByID({ collection: 'project-files', id: Number(id), depth: 0, overrideAccess: true }).catch(() => null)
  if (!doc) return notFound()
  const projectId = typeof doc.project === 'object' ? doc.project.id : doc.project

  const { user } = await payload.auth({ headers: req.headers }).catch(() => ({ user: null }))
  if (!user) {
    const client = await getClient()
    if (!client) return notFound()
    const ok = await payload.count({
      collection: 'projects',
      where: { and: [{ id: { equals: projectId } }, { clients: { in: [client.id] } }] },
      overrideAccess: true,
    })
    if (!ok.totalDocs) return notFound()
  }

  const name = size === 'thumb' ? (doc.sizes?.thumb?.filename ?? doc.filename) : doc.filename
  if (!name) return notFound()
  try {
    const body = await readFile(path.join(PROJECT_FILES_DIR, path.basename(name)))
    return new Response(new Uint8Array(body), {
      headers: { 'Content-Type': doc.mimeType ?? 'image/webp', 'Cache-Control': 'private, max-age=86400', 'X-Robots-Tag': 'noindex' },
    })
  } catch {
    return notFound()
  }
}
