// Change requests on delivered photos (collected as drafts until sent).
// POST   { project, photo, body, x?, y? } → the draft
// DELETE { project, id }                  → removes one of your drafts
import { NextRequest } from 'next/server'
import { getPayloadClient } from '@/lib/payload'
import { json, portalRequest } from '@/lib/portal-api'
import { canRequest, roundsOf } from '@/lib/revisions'

const coord = (v: unknown) => (typeof v === 'number' && v >= 0 && v <= 1 ? Math.round(v * 10000) / 10000 : null)

export async function POST(req: NextRequest) {
  const r = await portalRequest(req, 60)
  if (r instanceof Response) return r
  const { client, project, body } = r
  if (!(await canRequest(project))) return json({ error: 'No revision rounds left' }, 409)
  const text = typeof body.body === 'string' ? body.body.trim().slice(0, 1000) : ''
  const photoId = Number.isInteger(body.photo) ? (body.photo as number) : null
  if (!text || !photoId) return json({ error: 'Invalid request' }, 400)

  const payload = await getPayloadClient()
  const photo = await payload.findByID({ collection: 'photos', id: photoId, depth: 0, overrideAccess: true }).catch(() => null)
  const photoProject = photo && (typeof photo.project === 'object' ? photo.project?.id : photo.project)
  if (!photo || photo.purpose !== 'final' || photo.status !== 'ready' || photoProject !== project.id) return json({ error: 'Invalid photo' }, 400)

  const x = coord(body.x)
  const y = x === null ? null : coord(body.y)
  const created = await payload.create({
    collection: 'revisions',
    data: { project: project.id, photo: photoId, client: client.id, body: text, x, y, status: 'draft', round: roundsOf(project).used + 1 },
    overrideAccess: true,
  })
  return json({ revision: { id: created.id, photo: photoId, body: text, x, y, status: 'draft', round: created.round, mine: true, author: client.name.split(' ')[0] } })
}

export async function DELETE(req: NextRequest) {
  const r = await portalRequest(req, 60)
  if (r instanceof Response) return r
  const { client, project, body } = r
  const id = Number.isInteger(body.id) ? (body.id as number) : null
  if (!id) return json({ error: 'Invalid request' }, 400)
  const payload = await getPayloadClient()
  const res = await payload.delete({
    collection: 'revisions',
    where: { and: [{ id: { equals: id } }, { project: { equals: project.id } }, { client: { equals: client.id } }, { status: { equals: 'draft' } }] },
    overrideAccess: true,
  })
  return res.docs.length ? json({ ok: true }) : json({ error: 'Not found' }, 404)
}
