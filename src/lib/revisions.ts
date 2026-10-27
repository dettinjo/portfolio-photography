// Revision rounds on delivered photos.
import type { Payload } from 'payload'
import type { Client, Offering, Project } from '@/payload-types'
import { siteUrl } from './client-tokens'
import { sendRevisionsReady } from './email-client'

export function roundsOf(project: Pick<Project, 'revisionRounds' | 'offering'>) {
  const offering = project.offering && typeof project.offering === 'object' ? (project.offering as Offering) : null
  const included = project.revisionRounds?.included ?? offering?.revisionRounds ?? 1
  const used = project.revisionRounds?.used ?? 0
  return { included, used, left: Math.max(0, included - used) }
}

/** Every request of a round is done: tell the clients (and log it). */
export async function notifyRevisionsReady(payload: Payload, projectId: number, round: number) {
  const project = await payload.findByID({ collection: 'projects', id: projectId, depth: 1, overrideAccess: true })
  const done = await payload.count({
    collection: 'revisions',
    where: { and: [{ project: { equals: projectId } }, { round: { equals: round } }, { status: { equals: 'done' } }] },
    overrideAccess: true,
  })
  await payload.create({
    collection: 'activity',
    data: { project: projectId, actor: 'system', verb: 'note', clientVisible: true, message: `Round ${round}: ${done.totalDocs} changes done` },
    overrideAccess: true,
  })
  for (const c of (project.clients ?? []).filter((x): x is Client => typeof x === 'object' && x !== null)) {
    const locale = c.locale === 'de' ? 'de' : 'en'
    await sendRevisionsReady({
      to: c.email,
      name: c.name.split(' ')[0],
      locale,
      count: done.totalDocs,
      projectTitle: project.title,
      url: siteUrl(`/c/${project.slug}/photos`, locale),
    }).catch((err) => console.error(`[revisions] email to ${c.email} failed:`, err))
  }
}

/** Delivered photos can get change requests while the gallery is open and rounds are left. */
export async function canRequest(project: Project) {
  const { deliveryOpen } = await import('./delivery')
  return deliveryOpen(project) && roundsOf(project).left > 0
}

const pct = (v: number | null | undefined) => (typeof v === 'number' ? `${Math.round(v * 100)} %` : '')

/** The round as a text file for Lightroom (written to _from-client/). */
export function revisionsFile(
  project: Pick<Project, 'title'>,
  round: number,
  items: { filename: string; body: string; x?: number | null; y?: number | null; author: string }[],
  sentBy: string,
) {
  const files = [...new Set(items.map((i) => i.filename))]
  const lines = [
    `Changes, round ${round} — ${project.title}`,
    `Sent ${new Date().toISOString().slice(0, 16).replace('T', ' ')} UTC by ${sentBy}`,
    `${items.length} changes on ${files.length} photos`,
    '',
    'Lightroom: Library → Library Filter → Text → Filename → Contains, then paste:',
    files.map((f) => f.replace(/\.[^.]+$/, '')).join(', '),
    '',
  ]
  for (const f of files) {
    lines.push(f)
    for (const i of items.filter((x) => x.filename === f)) {
      lines.push(`    ${typeof i.x === 'number' ? `📍 ${pct(i.x)} / ${pct(i.y)}  ` : ''}${i.author}: ${i.body.replace(/\s*\n\s*/g, ' ')}`)
    }
  }
  return lines.join('\n') + '\n'
}
