// The proposal's numbers, always computed on the server from the project (the
// browser never sends an amount). Amounts in cents; no VAT (decision D6).
import type { Offering, Project } from '@/payload-types'

export interface ProposalSummary {
  lines: { label: string; cents: number }[]
  totalCents: number
  depositCents: number
  depositPercent: number | null
  note: string | null
  sentAt: string | null
  acceptedAt: string | null
}

export const DEFAULT_DEPOSIT_PERCENT = 30
const toCents = (euros: number) => Math.round(euros * 100)

export function proposalSummary(project: Project): ProposalSummary | null {
  const p = project.proposal
  if (!p?.lines?.length) return null
  const lines = p.lines.map((l) => ({ label: l.label, cents: toCents(l.amount) }))
  const totalCents = lines.reduce((sum, l) => sum + l.cents, 0)
  const offering = project.offering && typeof project.offering === 'object' ? (project.offering as Offering) : null

  let depositCents: number
  let depositPercent: number | null = null
  if (typeof p.depositAmount === 'number') {
    depositCents = Math.min(totalCents, toCents(p.depositAmount))
  } else {
    depositPercent = p.depositPercent ?? offering?.depositPercent ?? DEFAULT_DEPOSIT_PERCENT
    depositCents = Math.round((totalCents * depositPercent) / 100)
  }
  return {
    lines,
    totalCents,
    depositCents,
    depositPercent,
    note: p.note?.trim() || null,
    sentAt: p.sentAt ?? null,
    acceptedAt: p.acceptedAt ?? null,
  }
}

export const formatCents = (cents: number, locale: 'en' | 'de') =>
  new Intl.NumberFormat(locale === 'de' ? 'de-DE' : 'en-IE', {
    style: 'currency',
    currency: 'EUR',
    minimumFractionDigits: cents % 100 ? 2 : 0,
    maximumFractionDigits: 2,
  }).format(cents / 100)
