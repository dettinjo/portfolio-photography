// Numbers for /studio/stats: the last 12 months of inquiries, bookings and
// money, the pipeline by stage, galleries and how clients felt. Volumes are
// small (a photographer's year), so everything is computed from plain reads.
import 'server-only'
import type { Payload } from 'payload'
import type { Project } from '@/payload-types'
import { billingOf } from '@/lib/billing'
import { STAGES, isStage, stageIndex, type Stage } from '@/lib/stages'

export interface MonthPoint {
  key: string // YYYY-MM
  inquiries: number
  bookings: number
  revenueCents: number
}

export interface Stats {
  months: MonthPoint[]
  totals: {
    inquiries: number
    bookings: number
    conversion: number | null
    revenueCents: number
    revenueYearCents: number
    openCents: number
    pendingCents: number
  }
  pipeline: { stage: Stage; count: number }[]
  offerings: { title: string; inquiries: number; projects: number }[]
  galleries: { online: number; expiringSoon: number; guestLinks: number; guestViews: number; zipDownloads: number }
  feeling: { feedbackAvg: number | null; feedbackCount: number; reviewAvg: number | null; reviewCount: number; approved: number }
}

const DAY = 86_400_000
const all = { limit: 0, pagination: false, depth: 0, overrideAccess: true } as const
const monthKey = (iso: string) => new Intl.DateTimeFormat('en-CA', { timeZone: 'Europe/Berlin', year: 'numeric', month: '2-digit' }).format(new Date(iso)).slice(0, 7)
const relId = (v: unknown) => (typeof v === 'object' && v !== null ? (v as { id: number }).id : (v as number | null | undefined))
const avg = (xs: number[]) => (xs.length ? Math.round((xs.reduce((a, b) => a + b, 0) / xs.length) * 10) / 10 : null)

/** The last 12 month keys, oldest first, ending with the current month. */
export function lastMonths(now = new Date(), n = 12): string[] {
  const keys: string[] = []
  const d = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 15))
  for (let i = n - 1; i >= 0; i--) {
    const m = new Date(d)
    m.setUTCMonth(d.getUTCMonth() - i)
    keys.push(m.toISOString().slice(0, 7))
  }
  return keys
}

export async function getStats(payload: Payload, now = new Date()): Promise<Stats> {
  const keys = lastMonths(now)
  const since = new Date(`${keys[0]}-01T00:00:00Z`).toISOString()
  const [inquiries, projects, payments, booked, offerings, links, zips, feedback, reviews] = await Promise.all([
    payload.find({ collection: 'inquiries', where: { createdAt: { greater_than_equal: since } }, ...all }),
    payload.find({ collection: 'projects', ...all }),
    payload.find({ collection: 'payments', ...all }),
    payload.find({ collection: 'activity', where: { and: [{ verb: { equals: 'stage.changed' } }, { stage: { equals: 'booked' } }, { createdAt: { greater_than_equal: since } }] }, ...all }),
    payload.find({ collection: 'offerings', ...all, locale: 'en' }),
    payload.find({ collection: 'share-links', where: { revokedAt: { exists: false } }, ...all }),
    payload.count({ collection: 'activity', where: { and: [{ message: { contains: 'all photos' } }, { message: { contains: 'downloaded' } }, { createdAt: { greater_than_equal: since } }] }, overrideAccess: true }),
    payload.find({ collection: 'feedback', ...all }),
    payload.find({ collection: 'reviews', ...all }),
  ])

  const months = new Map<string, MonthPoint>(keys.map((key) => [key, { key, inquiries: 0, bookings: 0, revenueCents: 0 }]))
  for (const i of inquiries.docs) {
    const m = months.get(monthKey(i.createdAt))
    if (m) m.inquiries++
  }
  // A project counts as booked once, in the month it first reached "Booked"
  const firstBooked = new Map<number, string>()
  for (const a of [...booked.docs].sort((x, y) => x.createdAt.localeCompare(y.createdAt))) {
    const p = relId(a.project)
    if (p && !firstBooked.has(p)) firstBooked.set(p, a.createdAt)
  }
  for (const at of firstBooked.values()) {
    const m = months.get(monthKey(at))
    if (m) m.bookings++
  }
  const net = (p: (typeof payments.docs)[number]) => (['paid', 'partially_refunded', 'refunded'].includes(p.status) ? p.amount - (p.refunded ?? 0) : 0)
  const year = String(now.getUTCFullYear())
  let revenueYearCents = 0
  for (const p of payments.docs) {
    if (!p.paidAt || !net(p)) continue
    const key = monthKey(p.paidAt)
    const m = months.get(key)
    if (m) m.revenueCents += net(p)
    if (key.startsWith(year)) revenueYearCents += net(p)
  }

  // Open balances: accepted proposals not settled yet, archive excluded
  const paymentsBy = new Map<number, typeof payments.docs>()
  for (const p of payments.docs) {
    const id = relId(p.project)
    if (id) paymentsBy.set(id, [...(paymentsBy.get(id) ?? []), p])
  }
  const offeringById = new Map(offerings.docs.map((o) => [o.id, o]))
  let openCents = 0
  let pendingCents = 0
  for (const project of projects.docs as Project[]) {
    if (project.stage === 'archive') continue
    const b = billingOf(project, paymentsBy.get(project.id) ?? [], offeringById.get(relId(project.offering) as number) ?? null)
    openCents += b.dueCents
    pendingCents += b.pendingCents
  }

  const linked = new Set(projects.docs.map((p) => relId(p.inquiry)).filter(Boolean))
  const converted = inquiries.docs.filter((i) => linked.has(i.id) || i.status === 'booked').length

  const counts = new Map<string, number>()
  for (const p of projects.docs) if (isStage(p.stage)) counts.set(p.stage, (counts.get(p.stage) ?? 0) + 1)

  const byOffering = new Map<string, { title: string; inquiries: number; projects: number }>()
  const bump = (offering: unknown, field: 'inquiries' | 'projects') => {
    const o = offeringById.get(relId(offering) as number)
    const title = o?.title ?? 'Other'
    const row = byOffering.get(title) ?? { title, inquiries: 0, projects: 0 }
    row[field]++
    byOffering.set(title, row)
  }
  for (const i of inquiries.docs) bump(i.offering, 'inquiries')
  for (const p of projects.docs) if (p.createdAt >= since) bump(p.offering, 'projects')

  const t = now.getTime()
  const online = projects.docs.filter((p) => p.delivery?.deliveredAt && !p.delivery.purgedAt && (!p.delivery.expiresAt || new Date(p.delivery.expiresAt).getTime() > t))
  const reviewScores = reviews.docs.map((r) => avg([r.communication, r.creativity, r.professionalism, r.value].filter((x): x is number => typeof x === 'number'))).filter((x): x is number => x !== null)

  const series = [...months.values()]
  return {
    months: series,
    totals: {
      inquiries: inquiries.docs.length,
      bookings: firstBooked.size,
      conversion: inquiries.docs.length ? Math.round((converted / inquiries.docs.length) * 100) : null,
      revenueCents: series.reduce((s, m) => s + m.revenueCents, 0),
      revenueYearCents,
      openCents,
      pendingCents,
    },
    pipeline: STAGES.filter((s) => stageIndex(s) < stageIndex('archive')).map((stage) => ({ stage, count: counts.get(stage) ?? 0 })),
    offerings: [...byOffering.values()].sort((a, b) => b.inquiries + b.projects - (a.inquiries + a.projects)),
    galleries: {
      online: online.length,
      expiringSoon: online.filter((p) => p.delivery?.expiresAt && new Date(p.delivery.expiresAt).getTime() - t < 30 * DAY).length,
      guestLinks: links.docs.length,
      guestViews: links.docs.reduce((s, l) => s + (l.views ?? 0), 0),
      zipDownloads: zips.totalDocs,
    },
    feeling: {
      feedbackAvg: avg(feedback.docs.map((f) => f.rating)),
      feedbackCount: feedback.docs.length,
      reviewAvg: avg(reviewScores),
      reviewCount: reviews.docs.length,
      approved: reviews.docs.filter((r) => r.approved).length,
    },
  }
}
