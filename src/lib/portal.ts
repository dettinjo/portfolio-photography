// Data for the client portal (/c). Every read is scoped to the signed-in client.
import 'server-only'
import type { Client, Offering, Project } from '@/payload-types'
import { getPayloadClient } from '@/lib/payload'
import type { Locale } from '@/lib/portfolio'
import { isStage, type Stage } from '@/lib/stages'

export interface PortalProjectSummary {
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
}

const summary = (p: Project): PortalProjectSummary => ({
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

  const offering = p.offering && typeof p.offering === 'object' ? (p.offering as Offering) : null
  return {
    ...summary(p),
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
