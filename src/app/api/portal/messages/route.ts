// Write in the project thread: { project, body }
import { NextRequest } from 'next/server'
import { getPayloadClient } from '@/lib/payload'
import { json, portalRequest } from '@/lib/portal-api'
import { sendClientUpdateToAdmin } from '@/lib/email-client'
import { siteUrl } from '@/lib/client-tokens'
import { pushAdmins } from '@/lib/push'

export async function POST(req: NextRequest) {
  const r = await portalRequest(req, 30)
  if (r instanceof Response) return r
  const { client, project, body } = r
  const text = typeof body.body === 'string' ? body.body.trim().slice(0, 4000) : ''
  if (!text) return json({ error: 'Empty message' }, 400)

  const payload = await getPayloadClient()
  const created = await payload.create({
    collection: 'messages',
    data: { project: project.id, client: client.id, body: text },
    context: { fromPortal: true },
    overrideAccess: true,
  })
  await sendClientUpdateToAdmin({
    client: client.name,
    clientEmail: client.email,
    projectTitle: project.title,
    subject: `Message from ${client.name.split(' ')[0]}`,
    body: text,
    adminUrl: siteUrl(`/admin/collections/messages/create`, 'en'),
  }).catch((err) => console.error('[messages] email failed:', err))

  await pushAdmins(`💬 ${client.name.split(' ')[0]}`, text.slice(0, 140), `/admin/collections/projects/${project.id}`, `messages-${project.id}`)
  return json({
    message: { id: created.id, body: text, mine: true, author: client.name.split(' ')[0], fromPhotographer: false, createdAt: created.createdAt },
  })
}
