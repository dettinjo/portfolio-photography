// Private feedback along the way: { project, moment: 'booking' | 'sneak-peek', rating 1–5, comment? }
import { NextRequest } from 'next/server'
import { getPayloadClient } from '@/lib/payload'
import { json, portalRequest } from '@/lib/portal-api'
import { stars } from '@/lib/reviews'
import { sendClientUpdateToAdmin } from '@/lib/email-client'
import { siteUrl } from '@/lib/client-tokens'
import { pushAdmins } from '@/lib/push'

export async function POST(req: NextRequest) {
  const r = await portalRequest(req, 20)
  if (r instanceof Response) return r
  const { client, project, body } = r
  const moment = body.moment === 'booking' || body.moment === 'sneak-peek' ? body.moment : null
  const rating = stars(body.rating)
  const comment = typeof body.comment === 'string' ? body.comment.trim().slice(0, 2000) : ''
  if (!moment || !rating) return json({ error: 'Invalid feedback' }, 400)

  const payload = await getPayloadClient()
  const exists = await payload.count({
    collection: 'feedback',
    where: { and: [{ project: { equals: project.id } }, { client: { equals: client.id } }, { moment: { equals: moment } }] },
    overrideAccess: true,
  })
  if (exists.totalDocs) return json({ error: 'Already sent' }, 409)
  await payload.create({ collection: 'feedback', data: { project: project.id, client: client.id, moment, rating, comment }, overrideAccess: true })
  await sendClientUpdateToAdmin({
    client: client.name,
    clientEmail: client.email,
    projectTitle: project.title,
    subject: `Feedback ${moment === 'booking' ? 'after booking' : 'on the sneak peek'}: ${'★'.repeat(rating)}${'☆'.repeat(5 - rating)}`,
    body: comment || '(no comment)',
    adminUrl: siteUrl('/studio', 'en'),
  }).catch((err) => console.error('[feedback] email failed:', err))
  await pushAdmins(`${'★'.repeat(rating)}${'☆'.repeat(5 - rating)} ${client.name.split(' ')[0]}`, comment.slice(0, 140) || project.title, '/studio')
  return json({ ok: true })
}
