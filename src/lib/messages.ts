// Project thread: emails when the other side writes.
import type { Payload } from 'payload'
import type { Message } from '@/payload-types'
import { siteUrl } from './client-tokens'
import { sendMessageToClient } from './email-client'

const relId = (v: unknown) => (typeof v === 'object' && v !== null ? (v as { id: number }).id : (v as number))

export async function notifyClientsOfReply(payload: Payload, message: Message) {
  const project = await payload.findByID({ collection: 'projects', id: relId(message.project), depth: 1, overrideAccess: true })
  for (const c of project.clients ?? []) {
    if (typeof c !== 'object' || !c) continue
    const locale = c.locale === 'de' ? 'de' : 'en'
    await sendMessageToClient({
      to: c.email,
      name: c.name.split(' ')[0],
      locale,
      projectTitle: project.title,
      body: message.body,
      url: siteUrl(`/c/${project.slug}/messages`, locale),
    })
  }
}
