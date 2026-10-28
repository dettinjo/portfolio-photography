// The review after delivery (one per client and project):
// { project, ratings: {communication, creativity, professionalism, value}, quote, name, role?,
//   favourite?: photoId, consent?: { photoId: boolean }, agree: true }
import { NextRequest } from 'next/server'
import { getPayloadClient } from '@/lib/payload'
import { json, portalRequest } from '@/lib/portal-api'
import { RATING_KEYS, applyConsent, stars } from '@/lib/reviews'
import { isStage, stageIndex } from '@/lib/stages'
import { singleLine } from '@/lib/security'
import { pushAdmins } from '@/lib/push'

export async function POST(req: NextRequest) {
  const r = await portalRequest(req, 10)
  if (r instanceof Response) return r
  const { client, project, body } = r
  if (!project.delivery?.deliveredAt) return json({ error: 'Not delivered yet' }, 409)
  if (body.agree !== true) return json({ error: 'Please confirm that the review may be published' }, 400)

  const ratings = (body.ratings ?? {}) as Record<string, unknown>
  const values = Object.fromEntries(RATING_KEYS.map((k) => [k, stars(ratings[k])]))
  const quote = typeof body.quote === 'string' ? body.quote.trim().slice(0, 1500) : ''
  const name = singleLine(body.name, 80) || client.name
  const role = singleLine(body.role, 80)
  if (!quote || RATING_KEYS.some((k) => !values[k])) return json({ error: 'Please rate and write a few words' }, 400)

  const payload = await getPayloadClient()
  const exists = await payload.count({
    collection: 'reviews',
    where: { and: [{ project: { equals: project.id } }, { client: { equals: client.id } }] },
    overrideAccess: true,
  })
  if (exists.totalDocs) return json({ error: 'Already reviewed' }, 409)

  // The favourite must be one of this project's finals
  let favourite: number | null = null
  if (Number.isInteger(body.favourite)) {
    const hit = await payload.count({
      collection: 'photos',
      where: { and: [{ id: { equals: body.favourite } }, { project: { equals: project.id } }, { purpose: { equals: 'final' } }] },
      overrideAccess: true,
    })
    if (hit.totalDocs) favourite = body.favourite as number
  }

  await payload.create({
    collection: 'reviews',
    data: { project: project.id, client: client.id, favouritePhoto: favourite, name, role, quote, approved: false, ...values } as never,
    overrideAccess: true,
  })
  const consented = await applyConsent(payload, project, client, body.consent)

  const stage = isStage(project.stage) ? project.stage : 'delivery'
  if (stageIndex(stage) < stageIndex('feedback')) {
    await payload.update({ collection: 'projects', id: project.id, data: { stage: 'feedback' }, context: { skipFolders: true }, overrideAccess: true })
  }
  await payload.create({
    collection: 'activity',
    data: { project: project.id, actor: 'client', client: client.id, verb: 'note', clientVisible: true, message: `Review written by ${client.name.split(' ')[0]}` },
    overrideAccess: true,
  })
  await pushAdmins(`⭐ Review from ${name}`, quote.slice(0, 140), '/admin/collections/reviews')
  return json({ ok: true, consented })
}
