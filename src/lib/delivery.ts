// Delivered galleries over time (decision D5): reminders 30 and 7 days before
// they close, and on expiry the server copies are deleted (Nextcloud keeps the
// originals; extending the date in the admin brings the gallery back).
import 'server-only'
import type { Payload } from 'payload'
import type { Client, Project } from '@/payload-types'
import { siteUrl } from '@/lib/client-tokens'
import { sendExpiryReminder } from '@/lib/email-client'
import { removeAllVersions } from '@/lib/sync/process'

const DAY = 86_400_000

/** True while the finals of a project can be viewed and downloaded. */
export function deliveryOpen(project: Pick<Project, 'delivery'>) {
  const d = project.delivery
  if (!d?.deliveredAt || d.purgedAt) return false
  return !d.expiresAt || new Date(d.expiresAt).getTime() > Date.now()
}

export async function runDeliveryHousekeeping(payload: Payload) {
  const due = await payload.find({
    collection: 'projects',
    where: { and: [{ 'delivery.expiresAt': { exists: true } }, { 'delivery.purgedAt': { exists: false } }, { 'delivery.deliveredAt': { exists: true } }] },
    limit: 0,
    pagination: false,
    depth: 1,
    overrideAccess: true,
  })
  for (const project of due.docs) {
    try {
      await handle(payload, project)
    } catch (err) {
      console.error(`[delivery] project ${project.id} failed:`, err)
    }
  }
}

async function handle(payload: Payload, project: Project) {
  const expiresAt = project.delivery?.expiresAt as string
  const left = new Date(expiresAt).getTime() - Date.now()

  if (left <= 0) {
    const finals = await payload.find({
      collection: 'photos',
      where: { and: [{ project: { equals: project.id } }, { purpose: { equals: 'final' } }] },
      limit: 0,
      pagination: false,
      depth: 0,
      overrideAccess: true,
    })
    for (const photo of finals.docs) {
      await removeAllVersions(photo.ncFileId, 'finals')
      if (photo.status !== 'missing') await payload.update({ collection: 'photos', id: photo.id, data: { status: 'expired' }, overrideAccess: true })
    }
    await payload.update({
      collection: 'projects',
      id: project.id,
      data: { delivery: { ...project.delivery, purgedAt: new Date().toISOString() } },
      context: { skipFolders: true },
      overrideAccess: true,
    })
    await payload.create({
      collection: 'activity',
      data: { project: project.id, actor: 'system', verb: 'note', message: `Gallery expired: ${finals.docs.length} finals removed from the server` },
      overrideAccess: true,
    })
    return
  }

  const which = left <= 7 * DAY && !project.delivery?.reminder7SentAt ? 7 : left <= 30 * DAY && !project.delivery?.reminder30SentAt ? 30 : null
  if (!which) return
  const days = Math.max(1, Math.ceil(left / DAY))
  for (const c of (project.clients ?? []).filter((x): x is Client => typeof x === 'object' && x !== null)) {
    const locale = c.locale === 'de' ? 'de' : 'en'
    await sendExpiryReminder({
      to: c.email,
      name: c.name.split(' ')[0],
      locale,
      days,
      projectTitle: project.title,
      expiresAt,
      url: siteUrl(`/c/${project.slug}/photos`, locale),
    }).catch((err) => console.error(`[delivery] reminder to ${c.email} failed:`, err))
  }
  await payload.update({
    collection: 'projects',
    id: project.id,
    // The 7-day reminder also covers the 30-day one when both are due
    data: { delivery: { ...project.delivery, reminder7SentAt: which === 7 ? new Date().toISOString() : project.delivery?.reminder7SentAt, reminder30SentAt: project.delivery?.reminder30SentAt ?? new Date().toISOString() } },
    context: { skipFolders: true },
    overrideAccess: true,
  })
}
