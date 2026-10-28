// Accept the proposal: { project: slug }. Records the acceptance (once), then
// returns a Stripe Checkout URL for the deposit — or { manual: true } when
// online payment is not configured.
import { NextRequest } from 'next/server'
import { getPayloadClient } from '@/lib/payload'
import { json, portalRequest } from '@/lib/portal-api'
import { formatCents, proposalSummary } from '@/lib/proposal'
import { PaymentError, startDepositCheckout } from '@/lib/payments'
import { stripeEnabled } from '@/lib/stripe'
import { sendProposalAccepted } from '@/lib/email-client'
import { pushAdmins } from '@/lib/push'

export async function POST(req: NextRequest) {
  const r = await portalRequest(req, 10)
  if (r instanceof Response) return r
  const { client, project, body } = r
  if (body.accept !== true) return json({ error: 'Please confirm that you accept the proposal' }, 400)

  const summary = proposalSummary(project)
  if (!summary || !summary.sentAt) return json({ error: 'There is no proposal to accept' }, 404)

  const payload = await getPayloadClient()
  const locale = client.locale === 'de' ? 'de' : 'en'
  const manual = !stripeEnabled()

  if (!summary.acceptedAt) {
    await payload.update({
      collection: 'projects',
      id: project.id,
      data: { proposal: { ...project.proposal, acceptedAt: new Date().toISOString(), acceptedBy: client.id } },
      context: { skipFolders: true },
      overrideAccess: true,
    })
    await payload.create({
      collection: 'activity',
      data: { project: project.id, actor: 'client', client: client.id, verb: 'note', clientVisible: true, message: `Proposal accepted by ${client.name}` },
      overrideAccess: true,
    })
    await sendProposalAccepted({
      projectTitle: project.title,
      client: client.name,
      deposit: formatCents(summary.depositCents, 'en'),
      manual,
    }).catch((err) => console.error('[proposal] email failed:', err))
    await pushAdmins('🤝 Proposal accepted', `${client.name}: ${project.title}`, `/admin/collections/projects/${project.id}`)
  }

  if (manual) return json({ ok: true, manual: true })
  try {
    const url = await startDepositCheckout(payload, project, client, locale)
    return json({ ok: true, url })
  } catch (err) {
    if (err instanceof PaymentError) return json({ error: err.message }, 409)
    console.error('[proposal] checkout failed:', err)
    return json({ error: 'Payment could not be started' }, 502)
  }
}
