// /studio: the photographer's phone app. Uses the Payload admin login.
import 'server-only'
import { headers } from 'next/headers'
import { redirect } from 'next/navigation'
import { NextRequest, NextResponse } from 'next/server'
import type { User } from '@/payload-types'
import { getPayloadClient } from '@/lib/payload'

/** For pages: the signed-in admin, else off to the admin login (and back). */
export async function requireAdminPage(back = '/studio'): Promise<User> {
  const payload = await getPayloadClient()
  const { user } = await payload.auth({ headers: await headers() }).catch(() => ({ user: null }))
  if (!user) redirect(`/admin/login?redirect=${encodeURIComponent(back)}`)
  return user as User
}

/**
 * For the Web Share Target: the phone's share sheet posts without the Origin
 * header Payload's CSRF check expects, so read the login cookie and verify it
 * as a token. Safe because the cookie is SameSite=Lax: other sites can't post with it.
 */
export async function adminFromCookie(req: NextRequest): Promise<User | null> {
  const payload = await getPayloadClient()
  const token = req.cookies.get(`${payload.config.cookiePrefix}-token`)?.value
  if (!token) return null
  const { user } = await payload.auth({ headers: new Headers({ Authorization: `JWT ${token}` }) }).catch(() => ({ user: null }))
  return (user as User) ?? null
}

/** For API routes: the admin, or a 401 response. */
export async function requireAdminApi(req: NextRequest): Promise<User | NextResponse> {
  const payload = await getPayloadClient()
  const { user } = await payload.auth({ headers: req.headers }).catch(() => ({ user: null }))
  return user ? (user as User) : NextResponse.json({ error: 'Not signed in' }, { status: 401 })
}

const relId = (v: unknown) => (typeof v === 'object' && v !== null ? (v as { id: number }).id : (v as number | null))

export async function getInbox() {
  const payload = await getPayloadClient()
  const all = { pagination: false, depth: 0, overrideAccess: true } as const
  const [inquiries, messages, revisions, reviews, feedback, projects] = await Promise.all([
    payload.find({ collection: 'inquiries', where: { status: { equals: 'new' } }, sort: '-createdAt', limit: 20, ...all, depth: 1 }),
    payload.find({ collection: 'messages', sort: '-createdAt', limit: 300, ...all }),
    payload.find({ collection: 'revisions', where: { status: { equals: 'requested' } }, limit: 300, ...all }),
    payload.find({ collection: 'reviews', where: { approved: { equals: false } }, sort: '-createdAt', limit: 20, ...all }),
    payload.find({ collection: 'feedback', sort: '-createdAt', limit: 5, ...all }),
    payload.find({ collection: 'projects', limit: 500, ...all, depth: 1 }),
  ])
  const byId = new Map(projects.docs.map((p) => [p.id, p]))
  const clientName = (projectId: number, clientId: number | null) => {
    const clients = byId.get(projectId)?.clients ?? []
    const c = clients.find((x) => typeof x === 'object' && x?.id === clientId)
    return typeof c === 'object' && c ? c.name : 'Client'
  }

  // A conversation needs an answer when its latest message is from a client
  const latest = new Map<number, (typeof messages.docs)[number]>()
  for (const m of messages.docs) {
    const pid = relId(m.project) as number
    if (!latest.has(pid)) latest.set(pid, m)
  }
  const unanswered = [...latest.values()]
    .filter((m) => m.client)
    .map((m) => {
      const pid = relId(m.project) as number
      return { projectId: pid, project: byId.get(pid)?.title ?? '—', from: clientName(pid, relId(m.client)), body: m.body, at: m.createdAt }
    })

  const changes = new Map<number, number>()
  for (const r of revisions.docs) changes.set(relId(r.project) as number, (changes.get(relId(r.project) as number) ?? 0) + 1)

  return {
    inquiries: inquiries.docs.map((i) => ({
      id: i.id,
      name: i.name,
      what: (typeof i.offering === 'object' && i.offering ? i.offering.title : null) ?? i.kind ?? null,
      date: i.date ?? null,
      location: i.location ?? null,
      message: i.message ?? null,
      at: i.createdAt,
    })),
    unanswered,
    changes: [...changes.entries()].map(([projectId, count]) => ({ projectId, project: byId.get(projectId)?.title ?? '—', count })),
    reviews: reviews.docs.map((r) => ({ id: r.id, name: r.name, quote: r.quote, project: relId(r.project) ? byId.get(relId(r.project) as number)?.title ?? null : null })),
    feedback: feedback.docs.map((f) => ({
      id: f.id,
      moment: f.moment,
      rating: f.rating,
      comment: f.comment ?? null,
      project: byId.get(relId(f.project) as number)?.title ?? '—',
      from: clientName(relId(f.project) as number, relId(f.client)),
    })),
  }
}

export interface UploadTarget {
  value: string
  label: string
  group: 'Projects' | 'Portfolio'
}

/** Where photos can go: each project's preview/final folder, and each portfolio series. */
export async function getUploadTargets(): Promise<UploadTarget[]> {
  const payload = await getPayloadClient()
  const [projects, series] = await Promise.all([
    payload.find({ collection: 'projects', where: { and: [{ ncFolder: { exists: true } }, { stage: { not_equals: 'archive' } }] }, sort: '-updatedAt', limit: 100, depth: 0, overrideAccess: true }),
    payload.find({ collection: 'series', where: { missing: { not_equals: true } }, sort: 'title', limit: 200, depth: 0, overrideAccess: true }),
  ])
  return [
    ...projects.docs.flatMap((p) => [
      { value: `project:${p.id}:preview`, label: `${p.title} → 1 Preview`, group: 'Projects' as const },
      { value: `project:${p.id}:final`, label: `${p.title} → 2 Final`, group: 'Projects' as const },
    ]),
    ...series.docs.filter((s) => s.ncPath).map((s) => ({ value: `series:${s.id}`, label: `Portfolio → ${s.title}${s.draft ? ' (draft)' : ''}`, group: 'Portfolio' as const })),
  ]
}
