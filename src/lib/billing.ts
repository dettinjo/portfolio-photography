// What a project costs and what is still open (docs/REDESIGN.md §7.5). Always
// computed on the server from the accepted proposal, the extra photos of the
// selection and the payments; the browser never sends an amount. Downloads of
// the finals wait for the balance unless the photographer switches that off or
// marks the balance as paid by hand (bank transfer, cash).
import type { Payload } from 'payload'
import type { Offering, Payment, Project } from '@/payload-types'
import { proposalSummary } from '@/lib/proposal'

export interface Billing {
  /** Accepted proposal total, in cents */
  totalCents: number
  /** Extra photos above the quota, as billed */
  extras: number
  extraUnitCents: number
  extrasCents: number
  /** Received, net of refunds */
  paidCents: number
  /** Started but not settled yet (e.g. SEPA) */
  pendingCents: number
  dueCents: number
  /** Marked as paid by hand */
  settledAt: string | null
  /** Downloads wait for the balance */
  locked: boolean
}

const NET: Payment['status'][] = ['paid', 'partially_refunded', 'refunded']

export function billingOf(project: Project, payments: Pick<Payment, 'amount' | 'refunded' | 'status'>[], offering?: Offering | null): Billing {
  const summary = proposalSummary(project)
  // Nothing is owed through the site until the client accepted a proposal
  const totalCents = summary?.acceptedAt ? summary.totalCents : 0
  const extras = totalCents ? Math.max(0, project.proofing?.extras ?? 0) : 0
  const unit = project.proofing?.extraPrice ?? offering?.extraImagePrice ?? 0
  const extraUnitCents = Math.round(unit * 100)
  const extrasCents = extras * extraUnitCents
  const paidCents = payments.filter((p) => NET.includes(p.status)).reduce((s, p) => s + p.amount - (p.refunded ?? 0), 0)
  const pendingCents = payments.filter((p) => p.status === 'processing').reduce((s, p) => s + p.amount, 0)
  const dueCents = Math.max(0, totalCents + extrasCents - paidCents)
  const settledAt = project.billing?.balancePaidAt ?? null
  return {
    totalCents,
    extras,
    extraUnitCents,
    extrasCents,
    paidCents,
    pendingCents,
    dueCents: settledAt ? 0 : dueCents,
    settledAt,
    locked: project.billing?.gateDownloads !== false && !settledAt && dueCents > 0,
  }
}

export async function getBilling(payload: Payload, project: Project): Promise<Billing> {
  const payments = await payload.find({
    collection: 'payments',
    where: { project: { equals: project.id } },
    limit: 0,
    pagination: false,
    depth: 0,
    overrideAccess: true,
  })
  let offering = typeof project.offering === 'object' ? project.offering : null
  if (!offering && typeof project.offering === 'number' && project.proofing?.extraPrice == null) {
    offering = await payload.findByID({ collection: 'offerings', id: project.offering, depth: 0, overrideAccess: true }).catch(() => null)
  }
  return billingOf(project, payments.docs, offering)
}

/** True when the downloads of this project are held back for the balance. */
export async function downloadsLocked(payload: Payload, project: Project) {
  return (await getBilling(payload, project)).locked
}
