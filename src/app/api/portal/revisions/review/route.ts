// Review a done change: { project, id, verdict: 'approve' | 'changes', body? }.
// "changes" files a new draft for the next round (while rounds are left).
import { NextRequest } from 'next/server'
import { getPayloadClient } from '@/lib/payload'
import { json, portalRequest } from '@/lib/portal-api'
import { roundsOf } from '@/lib/revisions'
import { deliveryOpen } from '@/lib/delivery'

export async function POST(req: NextRequest) {
  const r = await portalRequest(req, 60)
  if (r instanceof Response) return r
  const { client, project, body } = r
  const id = Number.isInteger(body.id) ? (body.id as number) : null
  const verdict = body.verdict === 'approve' ? 'approve' : body.verdict === 'changes' ? 'changes' : null
  if (!id || !verdict) return json({ error: 'Invalid request' }, 400)

  const payload = await getPayloadClient()
  const res = await payload.find({
    collection: 'revisions',
    where: { and: [{ id: { equals: id } }, { project: { equals: project.id } }, { status: { equals: 'done' } }] },
    limit: 1,
    depth: 0,
    overrideAccess: true,
  })
  const item = res.docs[0]
  if (!item) return json({ error: 'Not found' }, 404)

  const rounds = roundsOf(project)
  const text = typeof body.body === 'string' ? body.body.trim().slice(0, 1000) : ''
  if (verdict === 'changes' && (!text || !rounds.left || !deliveryOpen(project))) {
    return json({ error: rounds.left ? 'Please describe what is still not right' : 'No revision rounds left' }, 409)
  }

  const now = new Date().toISOString()
  await payload.update({ collection: 'revisions', id: item.id, data: { status: verdict === 'approve' ? 'approved' : 'changes', reviewedAt: now }, overrideAccess: true })
  let draft = null
  if (verdict === 'changes') {
    draft = await payload.create({
      collection: 'revisions',
      data: { project: project.id, photo: item.photo, client: client.id, body: text, x: item.x, y: item.y, status: 'draft', round: rounds.used + 1 },
      overrideAccess: true,
    })
  }

  // Nothing open any more → back to Delivery
  const open = await payload.count({
    collection: 'revisions',
    where: { and: [{ project: { equals: project.id } }, { status: { in: ['draft', 'requested', 'done'] } }] },
    overrideAccess: true,
  })
  if (!open.totalDocs && project.stage === 'revisions') {
    await payload.update({ collection: 'projects', id: project.id, data: { stage: 'delivery' }, context: { skipFolders: true }, overrideAccess: true })
  }
  await payload.create({
    collection: 'activity',
    data: { project: project.id, actor: 'client', client: client.id, verb: 'note', message: `${client.name}: change ${verdict === 'approve' ? 'approved' : 'not right yet'}` },
    overrideAccess: true,
  })
  return json({ ok: true, status: verdict === 'approve' ? 'approved' : 'changes', draft: draft && { id: draft.id, photo: typeof draft.photo === 'object' ? draft.photo.id : draft.photo, body: text, x: draft.x, y: draft.y, status: 'draft', round: draft.round, mine: true, author: client.name.split(' ')[0] } })
}
