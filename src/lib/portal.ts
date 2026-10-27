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
