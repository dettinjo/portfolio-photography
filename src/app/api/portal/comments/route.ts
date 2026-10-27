// Comments on previews.
// POST   { project, photo, body, x?, y? }  → the new comment
// DELETE { project, id }                   → removes one of your own comments
import { NextRequest } from 'next/server'
import { getPayloadClient } from '@/lib/payload'
import { isLocked, json, portalRequest } from '@/lib/portal-api'

const coord = (v: unknown) => (typeof v === 'number' && v >= 0 && v <= 1 ? Math.round(v * 10000) / 10000 : null)

export async function POST(req: NextRequest) {
  const r = await portalRequest(req, 60)
  if (r instanceof Response) return r
  const { client, project, body } = r
  if (isLocked(project)) return json({ error: 'Selection already sent' }, 409)

  const text = typeof body.body === 'string' ? body.body.trim().slice(0, 1000) : ''
  const photoId = Number.isInteger(body.photo) ? (body.photo as number) : null
  if (!text || !photoId) return json({ error: 'Invalid comment' }, 400)

  const payload = await getPayloadClient()
  const photo = await payload.findByID({ collection: 'photos', id: photoId, depth: 0, overrideAccess: true }).catch(() => null)
  const photoProject = photo && (typeof photo.project === 'object' ? photo.project?.id : photo.project)
  if (!photo || photo.purpose !== 'preview' || photoProject !== project.id) return json({ error: 'Invalid photo' }, 400)

  const x = coord(body.x)
  const y = x === null ? null : coord(body.y)
  const created = await payload.create({
    collection: 'comments',
    data: { project: project.id, photo: photoId, client: client.id, body: text, x, y: x === null ? null : y },
    overrideAccess: true,
  })
  return json({
    comment: {
      id: created.id,
      photo: photoId,
      body: text,
      x,
      y: x === null ? null : y,
      author: client.name.split(' ')[0],
      mine: true,
      fromPhotographer: false,
      resolved: false,
      createdAt: created.createdAt,
    },
  })
}

export async function DELETE(req: NextRequest) {
  const r = await portalRequest(req, 60)
  if (r instanceof Response) return r
  const { client, project, body } = r
  if (isLocked(project)) return json({ error: 'Selection already sent' }, 409)
  const id = Number.isInteger(body.id) ? (body.id as number) : null
  if (!id) return json({ error: 'Invalid comment' }, 400)

  const payload = await getPayloadClient()
  const res = await payload.delete({
    collection: 'comments',
    where: { and: [{ id: { equals: id } }, { client: { equals: client.id } }, { project: { equals: project.id } }] },
    overrideAccess: true,
  })
  return res.docs.length ? json({ ok: true }) : json({ error: 'Not found' }, 404)
}
