// Data for the client portal (/c). Every read is scoped to the signed-in client.
import 'server-only'
import type { Client, Offering, Project } from '@/payload-types'
import { getPayloadClient } from '@/lib/payload'
import type { Locale } from '@/lib/portfolio'
import { isStage, type Stage } from '@/lib/stages'
import { proposalSummary, type ProposalSummary } from '@/lib/proposal'

export interface PortalProjectSummary {
  id: number
  slug: string
  title: string
  stage: Stage
  shootDate: string | null
}

export interface PortalProject extends PortalProjectSummary {
  location: string | null
  offering: string | null
  nextStep: string | null
  keyDates: { label: string; date: string }[]
  activity: { id: number; message: string; stage: Stage | null; createdAt: string }[]
  proposal: ProposalSummary | null
  payments: { id: number; label: string; amount: number; refunded: number; status: string; kind: string; paidAt: string | null }[]
}

const summary = (p: Project): PortalProjectSummary => ({
  id: p.id,
  slug: p.slug ?? String(p.id),
  title: p.title,
  stage: isStage(p.stage) ? p.stage : 'proposal',
  shootDate: p.shootDate ?? null,
})

export async function getClientProjects(client: Client): Promise<PortalProjectSummary[]> {
  const payload = await getPayloadClient()
  const res = await payload.find({
    collection: 'projects',
    where: { clients: { in: [client.id] } },
    sort: '-shootDate',
    limit: 100,
    depth: 0,
    overrideAccess: true,
  })
  return res.docs.map(summary)
}

export async function getClientProject(client: Client, slug: string, locale: Locale): Promise<PortalProject | null> {
  const payload = await getPayloadClient()
  const res = await payload.find({
    collection: 'projects',
    where: { and: [{ slug: { equals: slug } }, { clients: { in: [client.id] } }] },
    limit: 1,
    depth: 1,
    locale,
    overrideAccess: true,
  })
  const p = res.docs[0]
  if (!p) return null

  const activity = await payload.find({
    collection: 'activity',
    where: { and: [{ project: { equals: p.id } }, { clientVisible: { equals: true } }] },
    sort: '-createdAt',
    limit: 30,
    depth: 0,
    overrideAccess: true,
  })

  const payments = await payload.find({
    collection: 'payments',
    where: { and: [{ project: { equals: p.id } }, { status: { not_in: ['open', 'expired'] } }] },
    sort: 'createdAt',
    limit: 50,
    depth: 0,
    overrideAccess: true,
  })

  const offering = p.offering && typeof p.offering === 'object' ? (p.offering as Offering) : null
  return {
    ...summary(p),
    proposal: p.proposal?.sentAt ? proposalSummary(p) : null,
    payments: payments.docs.map((x) => ({
      id: x.id,
      label: x.label,
      amount: x.amount,
      refunded: x.refunded ?? 0,
      status: x.status,
      kind: x.kind,
      paidAt: x.paidAt ?? null,
    })),
    location: p.location ?? null,
    offering: offering?.title ?? null,
    nextStep: p.nextStep?.trim() || null,
    keyDates: (p.keyDates ?? []).map((d) => ({ label: d.label, date: d.date })),
    activity: activity.docs.map((a) => ({
      id: a.id,
      message: a.message,
      stage: isStage(a.stage) ? a.stage : null,
      createdAt: a.createdAt,
    })),
  }
}

/** Dates in the photographer's time zone; the time only when one was set. */
export function formatDate(value: string, locale: Locale, withTime = false) {
  const date = new Date(value)
  const opts: Intl.DateTimeFormatOptions = { dateStyle: 'long', timeZone: 'Europe/Berlin' }
  // A date without a time (e.g. taken over from an inquiry) is stored as 00:00 UTC
  const hasTime = withTime && date.toISOString().slice(11, 19) !== '00:00:00'
  return new Intl.DateTimeFormat(locale === 'de' ? 'de-DE' : 'en-GB', hasTime ? { ...opts, timeStyle: 'short' } : opts).format(date)
}

// ── Proofing ───────────────────────────────────────────────────────────────

export interface ProofPhoto {
  id: number
  filename: string
  width: number
  height: number
  placeholder: string | null
  color: string | null
  src: string
  srcSet: string
  large: string
}

export interface ProofComment {
  id: number
  photo: number
  body: string
  x: number | null
  y: number | null
  author: string
  mine: boolean
  fromPhotographer: boolean
  resolved: boolean
  createdAt: string
}

export interface Proofing {
  project: Project
  photos: ProofPhoto[]
  /** photo id → first names of everyone who picked it */
  pickedBy: Record<number, string[]>
  mine: number[]
  comments: ProofComment[]
  quota: number | null
  extraPrice: number | null
  submittedAt: string | null
  pickers: number
}

const previewUrl = (p: { id: number; version?: string | null }, w: number) => `/api/previews/${p.id}/${p.version}/${w}`

/** The project with this slug, if the client belongs to it. */
export async function findClientProject(client: Client, slug: string): Promise<Project | null> {
  const payload = await getPayloadClient()
  const res = await payload.find({
    collection: 'projects',
    where: { and: [{ slug: { equals: slug } }, { clients: { in: [client.id] } }] },
    limit: 1,
    depth: 1,
    overrideAccess: true,
  })
  return res.docs[0] ?? null
}

export async function getProofing(client: Client, slug: string): Promise<Proofing | null> {
  const project = await findClientProject(client, slug)
  if (!project) return null
  const payload = await getPayloadClient()
  const all = { limit: 0, pagination: false, depth: 0, overrideAccess: true } as const

  const [photos, picks, comments] = await Promise.all([
    payload.find({
      collection: 'photos',
      where: { and: [{ project: { equals: project.id } }, { purpose: { equals: 'preview' } }, { status: { equals: 'ready' } }] },
      sort: ['order', 'filename'],
      ...all,
    }),
    payload.find({ collection: 'picks', where: { project: { equals: project.id } }, ...all }),
    payload.find({ collection: 'comments', where: { project: { equals: project.id } }, sort: 'createdAt', ...all }),
  ])

  const clients = (project.clients ?? []).filter((c): c is Client => typeof c === 'object' && c !== null)
  const firstName = (id: number | null | undefined) => clients.find((c) => c.id === id)?.name.split(' ')[0] ?? '—'
  const visible = new Set(photos.docs.map((p) => p.id))
  const relId = (v: unknown) => (typeof v === 'object' && v !== null ? (v as { id: number }).id : (v as number))

  const pickedBy: Record<number, string[]> = {}
  const mine: number[] = []
  for (const pick of picks.docs) {
    const photo = relId(pick.photo)
    if (!visible.has(photo)) continue
    ;(pickedBy[photo] ??= []).push(firstName(relId(pick.client)))
    if (relId(pick.client) === client.id) mine.push(photo)
  }

  const offering = project.offering && typeof project.offering === 'object' ? (project.offering as Offering) : null
  return {
    project,
    photos: photos.docs.map((p) => ({
      id: p.id,
      filename: p.filename,
      width: p.width ?? 1600,
      height: p.height ?? 1067,
      placeholder: p.placeholder ?? null,
      color: p.color ?? null,
      src: previewUrl(p, 960),
      srcSet: [480, 960, 1600].map((w) => `${previewUrl(p, w)} ${w}w`).join(', '),
      large: previewUrl(p, 2048),
    })),
    pickedBy,
    mine,
    comments: comments.docs
      .filter((c) => visible.has(relId(c.photo)))
      .map((c) => {
        const author = c.client ? relId(c.client) : null
        return {
          id: c.id,
          photo: relId(c.photo),
          body: c.body,
          x: c.x ?? null,
          y: c.y ?? null,
          author: author ? firstName(author) : 'Joel',
          mine: author === client.id,
          fromPhotographer: !author,
          resolved: Boolean(c.resolved),
          createdAt: c.createdAt,
        }
      }),
    quota: project.proofing?.quota ?? offering?.imageQuota ?? null,
    extraPrice: project.proofing?.extraPrice ?? offering?.extraImagePrice ?? null,
    submittedAt: project.proofing?.submittedAt ?? null,
    pickers: clients.length,
  }
}

// ── Plan & messages ───────────────────────────────────────────────────────

export interface MoodImage {
  id: number
  thumb: string
  full: string
  mine: boolean
}

export async function getMoodboard(client: Client, projectId: number): Promise<MoodImage[]> {
  const payload = await getPayloadClient()
  const res = await payload.find({
    collection: 'project-files',
    where: { and: [{ project: { equals: projectId } }, { kind: { equals: 'moodboard' } }] },
    sort: 'createdAt',
    limit: 100,
    depth: 0,
    overrideAccess: true,
  })
  return res.docs.map((f) => ({
    id: f.id,
    thumb: `/api/portal/files/${f.id}/thumb`,
    full: `/api/portal/files/${f.id}/full`,
    mine: (typeof f.client === 'object' ? f.client?.id : f.client) === client.id,
  }))
}

export interface ThreadItem {
  key: string
  kind: 'message' | 'comment'
  body: string
  author: string
  mine: boolean
  fromPhotographer: boolean
  createdAt: string
  photo?: { thumb: string; filename: string } | null
}

/** Messages and photo notes of a project, oldest first. */
export async function getThread(client: Client, project: Project): Promise<ThreadItem[]> {
  const payload = await getPayloadClient()
  const clients = (project.clients ?? []).filter((c): c is Client => typeof c === 'object' && c !== null)
  const name = (id: number | null | undefined) => (id ? clients.find((c) => c.id === id)?.name.split(' ')[0] ?? '—' : 'Joel')
  const relId = (v: unknown) => (typeof v === 'object' && v !== null ? (v as { id: number }).id : (v as number | null))

  const [messages, comments] = await Promise.all([
    payload.find({ collection: 'messages', where: { project: { equals: project.id } }, sort: 'createdAt', limit: 500, depth: 0, overrideAccess: true }),
    payload.find({ collection: 'comments', where: { project: { equals: project.id } }, sort: 'createdAt', limit: 500, depth: 1, overrideAccess: true }),
  ])
  const items: ThreadItem[] = [
    ...messages.docs.map((m) => {
      const author = relId(m.client)
      return { key: `m${m.id}`, kind: 'message' as const, body: m.body, author: name(author), mine: author === client.id, fromPhotographer: !author, createdAt: m.createdAt }
    }),
    ...comments.docs.map((c) => {
      const author = relId(c.client)
      const photo = typeof c.photo === 'object' && c.photo && c.photo.status === 'ready' ? c.photo : null
      return {
        key: `c${c.id}`,
        kind: 'comment' as const,
        body: c.body,
        author: name(author),
        mine: author === client.id,
        fromPhotographer: !author,
        createdAt: c.createdAt,
        photo: photo ? { thumb: `/api/previews/${photo.id}/${photo.version}/480`, filename: photo.filename } : null,
      }
    }),
  ]
  return items.sort((a, b) => a.createdAt.localeCompare(b.createdAt))
}

export async function hasPreviews(projectId: number) {
  const payload = await getPayloadClient()
  const res = await payload.count({
    collection: 'photos',
    where: { and: [{ project: { equals: projectId } }, { purpose: { equals: 'preview' } }, { status: { equals: 'ready' } }] },
    overrideAccess: true,
  })
  return res.totalDocs > 0
}

// ── Delivery ──────────────────────────────────────────────────────────────

export interface DeliveredPhoto {
  id: number
  filename: string
  width: number
  height: number
  placeholder: string | null
  color: string | null
  src: string
  srcSet: string
  large: string
  original: string
  web: string
  /** The version before the last re-export, for before/after */
  before: string | null
  /** The client agreed that it may be published */
  consent: boolean
}

export interface RevisionItem {
  id: number
  photo: number
  body: string
  x: number | null
  y: number | null
  status: 'draft' | 'requested' | 'done' | 'approved' | 'changes'
  round: number
  mine: boolean
  author: string
}

export interface Delivery {
  photos: DeliveredPhoto[]
  deliveredAt: string | null
  expiresAt: string | null
  purgedAt: string | null
  open: boolean
  bytes: number
  revisions: RevisionItem[]
  rounds: { included: number; used: number; left: number }
}

export async function getDelivery(project: Project, client?: Client): Promise<Delivery> {
  const { deliveryOpen } = await import('@/lib/delivery')
  const d = project.delivery
  const open = deliveryOpen(project)
  const { roundsOf } = await import('@/lib/revisions')
  const empty = {
    photos: [],
    deliveredAt: d?.deliveredAt ?? null,
    expiresAt: d?.expiresAt ?? null,
    purgedAt: d?.purgedAt ?? null,
    open,
    bytes: 0,
    revisions: [],
    rounds: roundsOf(project),
  }
  if (!open) return empty
  const payload = await getPayloadClient()
  const res = await payload.find({
    collection: 'photos',
    where: { and: [{ project: { equals: project.id } }, { purpose: { equals: 'final' } }, { status: { equals: 'ready' } }] },
    sort: ['order', 'filename'],
    limit: 0,
    pagination: false,
    depth: 0,
    overrideAccess: true,
  })
  const url = (p: { id: number; version?: string | null }, w: number) => `/api/previews/${p.id}/${p.version}/${w}`
  const revisions = await payload.find({
    collection: 'revisions',
    where: { and: [{ project: { equals: project.id } }, { status: { not_equals: 'changes' } }] },
    sort: 'createdAt',
    limit: 0,
    pagination: false,
    depth: 0,
    overrideAccess: true,
  })
  const clients = (project.clients ?? []).filter((c): c is Client => typeof c === 'object' && c !== null)
  const relId = (v: unknown) => (typeof v === 'object' && v !== null ? (v as { id: number }).id : (v as number | null))
  return {
    ...empty,
    revisions: revisions.docs.map((r) => {
      const author = relId(r.client)
      return {
        id: r.id,
        photo: relId(r.photo) as number,
        body: r.body,
        x: r.x ?? null,
        y: r.y ?? null,
        status: r.status,
        round: r.round,
        mine: Boolean(client && author === client.id),
        author: clients.find((c) => c.id === author)?.name.split(' ')[0] ?? 'Joel',
      }
    }),
    bytes: res.docs.reduce((sum, p) => sum + (p.bytes ?? 0), 0),
    photos: res.docs.map((p) => ({
      id: p.id,
      filename: p.filename,
      width: p.width ?? 1600,
      height: p.height ?? 1067,
      placeholder: p.placeholder ?? null,
      color: p.color ?? null,
      src: url(p, 960),
      srcSet: [480, 960, 1600].map((w) => `${url(p, w)} ${w}w`).join(', '),
      large: url(p, 1600),
      original: `/api/portal/download/${p.id}/original`,
      web: `/api/portal/download/${p.id}/web`,
      before: p.previousVersion ? `/api/previews/${p.id}/${p.previousVersion}/1600` : null,
      consent: p.publishConsent === 'yes',
    })),
  }
}

export const formatBytes = (bytes: number, locale: 'en' | 'de') => {
  const units = ['B', 'KB', 'MB', 'GB']
  let n = bytes
  let i = 0
  while (n >= 1000 && i < units.length - 1) {
    n /= 1000
    i++
  }
  return `${new Intl.NumberFormat(locale === 'de' ? 'de-DE' : 'en-GB', { maximumFractionDigits: n < 10 && i > 1 ? 1 : 0 }).format(n)} ${units[i]}`
}

// ── Feedback & review ─────────────────────────────────────────────────────

export async function getFeedbackState(client: Client, projectId: number) {
  const payload = await getPayloadClient()
  const [feedback, reviews] = await Promise.all([
    payload.find({
      collection: 'feedback',
      where: { and: [{ project: { equals: projectId } }, { client: { equals: client.id } }] },
      limit: 10,
      depth: 0,
      overrideAccess: true,
    }),
    payload.count({
      collection: 'reviews',
      where: { and: [{ project: { equals: projectId } }, { client: { equals: client.id } }] },
      overrideAccess: true,
    }),
  ])
  const moments = new Set(feedback.docs.map((f) => f.moment))
  return { booking: moments.has('booking'), sneakPeek: moments.has('sneak-peek'), reviewed: reviews.totalDocs > 0 }
}
