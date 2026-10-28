// Guest links of a delivered gallery:
// { project, action: 'create', label, downloads } or { project, action: 'revoke', id }.
import { NextRequest } from 'next/server'
import { getPayloadClient } from '@/lib/payload'
import { json, portalRequest } from '@/lib/portal-api'
import { deliveryOpen } from '@/lib/delivery'
import { MAX_LINKS, newToken } from '@/lib/share'
import { pushAdmins } from '@/lib/push'

export async function POST(req: NextRequest) {
  const r = await portalRequest(req, 60)
  if (r instanceof Response) return r
  const { client, project, body } = r
  if (!deliveryOpen(project)) return json({ error: 'The gallery is not online' }, 409)
  const payload = await getPayloadClient()
  const log = (message: string) =>
    payload.create({
      collection: 'activity',
      data: { project: project.id, actor: 'client', client: client.id, verb: 'note', clientVisible: true, message },
      overrideAccess: true,
    })

  if (body.action === 'create') {
    const label = typeof body.label === 'string' ? body.label.trim().slice(0, 60) : ''
    if (!label) return json({ error: 'Please give the link a name' }, 400)
    const active = await payload.count({
      collection: 'share-links',
      where: { and: [{ project: { equals: project.id } }, { revokedAt: { exists: false } }] },
      overrideAccess: true,
    })
    if (active.totalDocs >= MAX_LINKS) return json({ error: 'Too many links — switch an old one off first' }, 409)
    const link = await payload.create({
      collection: 'share-links',
      data: { project: project.id, createdBy: client.id, label, token: newToken(), downloads: body.downloads === true },
      overrideAccess: true,
    })
    await log(`${client.name.split(' ')[0]} created the guest link "${label}"`)
    await pushAdmins('🔗 Guest link', `${client.name}: "${label}" for ${project.title}`, `/studio/projects/${project.id}`)
    return json({ ok: true, id: link.id, token: link.token })
  }

  if (body.action === 'revoke' && Number.isInteger(body.id)) {
    const link = await payload.findByID({ collection: 'share-links', id: body.id as number, depth: 0, overrideAccess: true }).catch(() => null)
    const linkProject = link && (typeof link.project === 'object' ? link.project.id : link.project)
    if (!link || linkProject !== project.id) return json({ error: 'Not found' }, 404)
    if (!link.revokedAt) {
      await payload.update({ collection: 'share-links', id: link.id, data: { revokedAt: new Date().toISOString() }, overrideAccess: true })
      await log(`${client.name.split(' ')[0]} switched off the guest link "${link.label}"`)
    }
    return json({ ok: true })
  }
  return json({ error: 'Unknown action' }, 400)
}
