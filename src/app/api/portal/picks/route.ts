// Pick or un-pick a preview: { project: slug, photo: id, picked: boolean }
import { NextRequest } from 'next/server'
import type { Where } from 'payload'
import { getPayloadClient } from '@/lib/payload'
import { isLocked, json, portalRequest } from '@/lib/portal-api'

export async function POST(req: NextRequest) {
  const r = await portalRequest(req)
  if (r instanceof Response) return r
  const { client, project, body } = r
  if (isLocked(project)) return json({ error: 'Selection already sent' }, 409)
  const photoId = Number.isInteger(body.photo) ? (body.photo as number) : null
  if (!photoId) return json({ error: 'Invalid photo' }, 400)

  const payload = await getPayloadClient()
  const photo = await payload.findByID({ collection: 'photos', id: photoId, depth: 0, overrideAccess: true }).catch(() => null)
  const photoProject = photo && (typeof photo.project === 'object' ? photo.project?.id : photo.project)
  if (!photo || photo.purpose !== 'preview' || photo.status !== 'ready' || photoProject !== project.id) {
    return json({ error: 'Invalid photo' }, 400)
  }

  const where: Where = { and: [{ photo: { equals: photoId } }, { client: { equals: client.id } }] }
  if (body.picked === true) {
    const exists = await payload.count({ collection: 'picks', where, overrideAccess: true })
    if (!exists.totalDocs) {
      await payload
        .create({ collection: 'picks', data: { project: project.id, photo: photoId, client: client.id }, overrideAccess: true })
        .catch(() => {}) // a parallel request created it already (unique index)
    }
  } else {
    await payload.delete({ collection: 'picks', where, overrideAccess: true })
  }
  return json({ ok: true, picked: body.picked === true })
}
