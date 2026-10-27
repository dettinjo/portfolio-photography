// "Send proposal" from the admin: email every client a sign-in link that
// leads straight to the proposal in the portal.
import type { Payload, PayloadRequest } from 'payload'
import type { Project } from '@/payload-types'
import { INVITE_LINK_TTL_MS, issueLoginToken, signInUrl } from './client-tokens'
import { sendProposalEmail } from './email-client'

const relId = (v: unknown) => (typeof v === 'object' && v !== null ? (v as { id: number }).id : (v as number))

export async function notifyProposal(payload: Payload, project: Project, req: PayloadRequest) {
  for (const id of (project.clients ?? []).map(relId)) {
    const client = await payload.findByID({ collection: 'clients', id, depth: 0, req, overrideAccess: true })
    const locale = client.locale === 'de' ? 'de' : 'en'
    const token = await issueLoginToken(payload, client.id, INVITE_LINK_TTL_MS, req)
    let message = `Proposal sent to ${client.email}`
    try {
      await sendProposalEmail({ to: client.email, name: client.name.split(' ')[0], locale, projectTitle: project.title, url: signInUrl(token, locale) })
    } catch (err) {
      message = `Proposal email to ${client.email} FAILED: ${(err as Error).message.slice(0, 200)}`
    }
    await payload.create({
      collection: 'activity',
      data: { project: project.id, actor: 'admin', verb: 'note', message },
      req,
      overrideAccess: true,
    })
  }
}
