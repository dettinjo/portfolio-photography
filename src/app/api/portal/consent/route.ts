// Change publication consent for delivered photos: { project, consent: { photoId: boolean } }.
// Clients can grant or withdraw it at any time.
import { NextRequest } from 'next/server'
import { getPayloadClient } from '@/lib/payload'
import { json, portalRequest } from '@/lib/portal-api'
import { applyConsent } from '@/lib/reviews'

export async function POST(req: NextRequest) {
  const r = await portalRequest(req, 30)
  if (r instanceof Response) return r
  const { client, project, body } = r
  const payload = await getPayloadClient()
  const changed = await applyConsent(payload, project, client, body.consent)
  if (changed) {
    await payload.create({
      collection: 'activity',
      data: { project: project.id, actor: 'client', client: client.id, verb: 'note', message: `${client.name} changed publication consent for ${changed} photos` },
      overrideAccess: true,
    })
  }
  return json({ ok: true, changed })
}
