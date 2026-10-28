// Client projects in Nextcloud → Clients/<date> <name>/1 Preview
//
// - Each folder below the clients folder belongs to one project (matched by its
//   Nextcloud file id, then by path). A folder nobody created from the admin
//   becomes a project stub, so nothing dropped there goes unnoticed.
// - Images in "1 Preview" become preview photos, rendered with the project's
//   watermark burned in and stored apart from the public portfolio files.
// - When the first previews are ready the project moves to "Selection" and the
//   clients get an email.
import 'server-only'
import { createHash } from 'node:crypto'
import type { Payload } from 'payload'
import type { Client, Project } from '@/payload-types'
import { getPayloadClient } from '@/lib/payload'
import { CLIENTS_DAV_PATH, downloadFile, listFolder, nextcloudConfigured, type DavEntry } from '@/lib/nextcloud'
import { stageIndex, isStage } from '@/lib/stages'
import { siteUrl } from '@/lib/client-tokens'
import { sendPreviewsReadyEmail } from '@/lib/email-client'
import { hasProcessedFiles, processPhoto, removeAllVersions, removeOtherVersions } from './process'
import { debounce } from './queue'
import { pushProjectClients } from '@/lib/push'

const IMAGE_TYPES = new Set(['image/jpeg', 'image/png', 'image/webp', 'image/tiff'])
const DEBOUNCE_MS = Number(process.env.SYNC_DEBOUNCE_MS ?? 60_000)
export const PREVIEW_FOLDER = '1 Preview'
export const FINAL_FOLDER = '2 Final'

const relId = (value: unknown) =>
  typeof value === 'object' && value !== null ? (value as { id: number }).id : (value as number | null | undefined)

// ── Scheduling ────────────────────────────────────────────────────────────

/** Sync one project (from the admin: "fetch previews now", watermark changed). */
export function scheduleProjectSync(projectId: number, delay = DEBOUNCE_MS) {
  debounce(`project:${projectId}`, delay, `project ${projectId}`, async () => {
    const payload = await getPayloadClient()
    const project = await payload.findByID({ collection: 'projects', id: projectId, depth: 0, overrideAccess: true }).catch(() => null)
    if (!project?.ncFolder || !nextcloudConfigured()) return
    const [folder] = await listFolder(project.ncFolder)
    if (folder?.isCollection) await syncClientFolder(payload, folder)
  })
}

/** Sync the project folder a webhook event touched. */
export function scheduleClientFolderSync(folderPath: string, delay = DEBOUNCE_MS) {
  debounce(`client:${folderPath}`, delay, `client folder ${folderPath}`, async () => {
    const payload = await getPayloadClient()
    const [folder] = await listFolder(folderPath)
    if (folder?.isCollection && folder.path === folderPath) await syncClientFolder(payload, folder)
  })
}

// ── Reconcile ─────────────────────────────────────────────────────────────

/** Syncs every project folder. Returns error messages. */
export async function reconcileClients(payload: Payload): Promise<string[]> {
  if (!nextcloudConfigured()) return []
  const root = await listFolder(CLIENTS_DAV_PATH)
  const folders = root.filter((e) => e.isCollection && e.path !== CLIENTS_DAV_PATH && e.fileId)
  const errors: string[] = []
  for (const folder of folders) {
    try {
      errors.push(...(await syncClientFolder(payload, folder)))
    } catch (err) {
      errors.push(`${folder.path}: ${(err as Error).message}`)
    }
  }
  return errors
}

export async function syncClientFolder(payload: Payload, folder: DavEntry): Promise<string[]> {
  const project = await projectForFolder(payload, folder)
  return [...(await syncPreviews(payload, project, folder.path)), ...(await syncFinals(payload, project, folder.path))]
}

async function projectForFolder(payload: Payload, folder: DavEntry): Promise<Project> {
  const find = async (where: object) =>
    (await payload.find({ collection: 'projects', where: where as never, limit: 1, depth: 0, overrideAccess: true })).docs[0]
  const project = (await find({ ncFolderId: { equals: folder.fileId } })) ?? (await find({ ncFolder: { equals: folder.path } }))

  if (!project) {
    const created = await payload.create({
      collection: 'projects',
      data: {
        title: folder.name,
        stage: 'inquiry',
        ncFolder: folder.path,
        ncFolderId: folder.fileId,
        internalNotes: `Created from the Nextcloud folder "${folder.path}". Add the client and details.`,
      },
      context: { skipFolders: true },
      overrideAccess: true,
    })
    await payload.create({
      collection: 'activity',
      data: { project: created.id, actor: 'system', verb: 'folder', message: `New project from Nextcloud folder ${folder.name}` },
      overrideAccess: true,
    })
    return created
  }

  if (project.ncFolderId !== folder.fileId || project.ncFolder !== folder.path) {
    return payload.update({
      collection: 'projects',
      id: project.id,
      data: { ncFolder: folder.path, ncFolderId: folder.fileId, ncFolderError: null },
      context: { skipFolders: true },
      overrideAccess: true,
    })
  }
  return project
}

// ── Previews ──────────────────────────────────────────────────────────────

async function projectClients(payload: Payload, project: Project): Promise<Client[]> {
  const ids = (project.clients ?? []).map(relId).filter((v): v is number => typeof v === 'number')
  if (!ids.length) return []
  const res = await payload.find({ collection: 'clients', where: { id: { in: ids } }, limit: 0, pagination: false, depth: 0, overrideAccess: true })
  return res.docs
}

/** The text burned into previews: the admin's text, else the first client's name (decision D4). */
export function watermarkLabel(project: Pick<Project, 'watermarkText'>, clients: Pick<Client, 'name'>[]) {
  const custom = project.watermarkText?.trim()
  if (custom) return custom
  const name = clients[0]?.name?.trim()
  return name ? `${name.toUpperCase()} · PREVIEW` : 'PREVIEW'
}

const versionFor = (etag: string | null, label: string) =>
  ((etag ?? 'v0').toLowerCase().replace(/[^a-z0-9]/g, '').slice(0, 32) || 'v0') +
  createHash('sha1').update(label).digest('hex').slice(0, 6)

async function syncPreviews(payload: Payload, project: Project, folderPath: string): Promise<string[]> {
  const entries = await listFolder(`${folderPath}/${PREVIEW_FOLDER}`)
  const files = entries
    .filter((e) => !e.isCollection && IMAGE_TYPES.has(e.contentType) && e.fileId)
    .sort((a, b) => a.name.localeCompare(b.name, undefined, { numeric: true }))
  const clients = await projectClients(payload, project)
  const label = watermarkLabel(project, clients)
  const errors: string[] = []

  for (const [order, file] of files.entries()) {
    try {
      await syncPreview(payload, project.id, file, label, order)
    } catch (err) {
      errors.push(`${file.path}: ${(err as Error).message}`)
    }
  }

  // Previews no longer in the folder
  const present = files.map((f) => f.fileId as number)
  const vanished = await payload.find({
    collection: 'photos',
    where: {
      and: [
        { project: { equals: project.id } },
        { purpose: { equals: 'preview' } },
        { ncFileId: { not_in: present.length ? present : [-1] } },
        { status: { not_equals: 'missing' } },
      ],
    },
    limit: 0,
    pagination: false,
    depth: 0,
    overrideAccess: true,
  })
  for (const p of vanished.docs) {
    await payload.update({ collection: 'photos', id: p.id, data: { status: 'missing' }, overrideAccess: true })
    await removeAllVersions(p.ncFileId, 'previews')
  }

  if (files.length && !project.proofing?.previewsReadyAt) await announcePreviews(payload, project, clients)
  return errors
}

async function syncPreview(payload: Payload, projectId: number, file: DavEntry, label: string, order: number) {
  return syncImage(payload, projectId, file, order, 'preview', label)
}

async function syncImage(payload: Payload, projectId: number, file: DavEntry, order: number, purpose: 'preview' | 'final', label: string | null) {
  const kind = purpose === 'preview' ? 'previews' : 'finals'
  const fileId = file.fileId as number
  const version = versionFor(file.etag, label ?? '')
  const existing = await payload.find({ collection: 'photos', where: { ncFileId: { equals: fileId } }, limit: 1, depth: 0, overrideAccess: true })
  const photo =
    existing.docs[0] ??
    (await payload.create({
      collection: 'photos',
      data: { purpose, project: projectId, visibility: 'hidden', filename: file.name, ncFileId: fileId, ncPath: file.path, status: 'pending', order },
      overrideAccess: true,
    }))

  const place = { purpose, project: projectId, series: null, visibility: 'hidden' as const, filename: file.name, ncPath: file.path, order, bytes: file.size }
  const needsProcessing =
    photo.version !== version ||
    photo.purpose !== purpose ||
    photo.status === 'pending' ||
    photo.status === 'failed' ||
    photo.status === 'expired' ||
    !hasProcessedFiles(fileId, version, kind)

  if (!needsProcessing) {
    if (photo.status === 'missing' || relId(photo.project) !== projectId || photo.ncPath !== file.path || photo.order !== order) {
      await payload.update({ collection: 'photos', id: photo.id, data: { ...place, status: 'ready' }, overrideAccess: true })
    }
    return
  }

  // A re-export of a delivered photo: keep the version before it for before/after
  const prior = purpose === 'final' && photo.status === 'ready' && photo.version && photo.version !== version ? photo.version : null
  const previousVersion = prior ?? (photo.status === 'ready' ? photo.previousVersion : null) ?? null
  try {
    const result = await processPhoto(await downloadFile(file.path), fileId, version, { kind, watermark: label, originalName: file.name })
    await payload.update({
      collection: 'photos',
      id: photo.id,
      data: {
        ...place,
        etag: file.etag,
        version,
        watermark: label ?? null,
        previousVersion,
        ...(prior && { revisedAt: new Date().toISOString() }),
        width: result.width,
        height: result.height,
        widths: result.widths,
        placeholder: result.placeholder,
        color: result.color,
        takenAt: result.takenAt,
        meta: result.meta,
        status: 'ready',
        error: null,
      },
      overrideAccess: true,
    })
    await removeOtherVersions(fileId, version, kind, [previousVersion])
  } catch (err) {
    await payload.update({
      collection: 'photos',
      id: photo.id,
      data: { ...place, status: 'failed', error: (err as Error).message.slice(0, 500) },
      overrideAccess: true,
    })
    throw err
  }
}

// ── Finals ────────────────────────────────────────────────────────────────

/** Months a delivered gallery stays online (decision D5). */
export const DELIVERY_MONTHS = 12

async function syncFinals(payload: Payload, project: Project, folderPath: string): Promise<string[]> {
  // Expired galleries stay deleted until the photographer extends them
  if (project.delivery?.purgedAt) return []
  const entries = await listFolder(`${folderPath}/${FINAL_FOLDER}`)
  const files = entries
    .filter((e) => !e.isCollection && IMAGE_TYPES.has(e.contentType) && e.fileId)
    .sort((a, b) => a.name.localeCompare(b.name, undefined, { numeric: true }))
  const errors: string[] = []
  for (const [order, file] of files.entries()) {
    try {
      await syncImage(payload, project.id, file, order, 'final', null)
    } catch (err) {
      errors.push(`${file.path}: ${(err as Error).message}`)
    }
  }

  const present = files.map((f) => f.fileId as number)
  const vanished = await payload.find({
    collection: 'photos',
    where: {
      and: [
        { project: { equals: project.id } },
        { purpose: { equals: 'final' } },
        { ncFileId: { not_in: present.length ? present : [-1] } },
        { status: { not_in: ['missing', 'expired'] } },
      ],
    },
    limit: 0,
    pagination: false,
    depth: 0,
    overrideAccess: true,
  })
  for (const p of vanished.docs) {
    await payload.update({ collection: 'photos', id: p.id, data: { status: 'missing' }, overrideAccess: true })
    await removeAllVersions(p.ncFileId, 'finals')
  }

  if (files.length && !project.delivery?.deliveredAt) await announceDelivery(payload, project)
  await markRevisionsDone(payload, project)
  return errors
}

/** Requested changes whose photo has a newer version now are done. */
async function markRevisionsDone(payload: Payload, project: Project) {
  const open = await payload.find({
    collection: 'revisions',
    where: { and: [{ project: { equals: project.id } }, { status: { equals: 'requested' } }] },
    limit: 0,
    pagination: false,
    depth: 1,
    overrideAccess: true,
  })
  if (!open.docs.length) return
  // The Revisions hook tells the clients once the last open request is done
  for (const r of open.docs) {
    const photo = typeof r.photo === 'object' ? r.photo : null
    if (photo?.status === 'ready' && photo.version && photo.version !== r.versionRequested) {
      await payload.update({ collection: 'revisions', id: r.id, data: { status: 'done', doneAt: new Date().toISOString() }, overrideAccess: true })
    }
  }
}

const addMonths = (date: Date, months: number) => {
  const d = new Date(date)
  d.setMonth(d.getMonth() + months)
  return d
}

/** First finals of a project: delivery date, 12-month expiry, stage Delivery, emails. */
async function announceDelivery(payload: Payload, project: Project) {
  const ready = await payload.count({
    collection: 'photos',
    where: { and: [{ project: { equals: project.id } }, { purpose: { equals: 'final' } }, { status: { equals: 'ready' } }] },
    overrideAccess: true,
  })
  if (!ready.totalDocs) return
  const now = new Date()
  const expiresAt = project.delivery?.expiresAt ?? addMonths(now, DELIVERY_MONTHS).toISOString()
  const stage = isStage(project.stage) ? project.stage : 'proposal'
  await payload.update({
    collection: 'projects',
    id: project.id,
    data: {
      delivery: { ...project.delivery, deliveredAt: now.toISOString(), expiresAt },
      ...(stageIndex(stage) < stageIndex('delivery') && { stage: 'delivery' }),
    },
    context: { skipFolders: true },
    overrideAccess: true,
  })
  await payload.create({
    collection: 'activity',
    data: { project: project.id, actor: 'system', verb: 'note', clientVisible: true, message: `${ready.totalDocs} final photos delivered` },
    overrideAccess: true,
  })
  await pushProjectClients(
    project,
    {
      en: { title: 'Your photos are here', body: `${ready.totalDocs} final photos are ready to download.` },
      de: { title: 'Deine Fotos sind da', body: `${ready.totalDocs} fertige Fotos stehen zum Download bereit.` },
    },
    '/photos',
    'delivery',
  )
  const { sendDeliveryEmail } = await import('@/lib/email-client')
  for (const client of await projectClients(payload, project)) {
    const locale = client.locale === 'de' ? 'de' : 'en'
    await sendDeliveryEmail({
      to: client.email,
      name: client.name.split(' ')[0],
      locale,
      count: ready.totalDocs,
      projectTitle: project.title,
      expiresAt,
      url: siteUrl(`/c/${project.slug}/photos`, locale),
    }).catch((err) => console.error(`[sync] delivery email to ${client.email} failed:`, err))
  }
}

/** First previews of a project: move it to "Selection" and tell the clients. */
async function announcePreviews(payload: Payload, project: Project, clients: Client[]) {
  const ready = await payload.count({
    collection: 'photos',
    where: { and: [{ project: { equals: project.id } }, { purpose: { equals: 'preview' } }, { status: { equals: 'ready' } }] },
    overrideAccess: true,
  })
  if (!ready.totalDocs) return

  const stage = isStage(project.stage) ? project.stage : 'proposal'
  await payload.update({
    collection: 'projects',
    id: project.id,
    data: {
      proofing: { ...project.proofing, previewsReadyAt: new Date().toISOString() },
      ...(stageIndex(stage) < stageIndex('proofing') && { stage: 'proofing' }),
    },
    context: { skipFolders: true },
    overrideAccess: true,
  })
  await payload.create({
    collection: 'activity',
    data: { project: project.id, actor: 'system', verb: 'note', clientVisible: true, message: `${ready.totalDocs} previews ready` },
    overrideAccess: true,
  })

  await pushProjectClients(
    project,
    {
      en: { title: 'Your previews are ready', body: `${ready.totalDocs} previews — pick your favourites.` },
      de: { title: 'Deine Vorschauen sind da', body: `${ready.totalDocs} Vorschauen — wähle deine Favoriten.` },
    },
    '/proofing',
    'previews',
  )
  for (const client of clients) {
    const locale = client.locale === 'de' ? 'de' : 'en'
    try {
      await sendPreviewsReadyEmail({
        to: client.email,
        name: client.name.split(' ')[0],
        locale,
        count: ready.totalDocs,
        projectTitle: project.title,
        url: siteUrl(`/c/${project.slug}/proofing`, locale),
      })
    } catch (err) {
      console.error(`[sync] previews email to ${client.email} failed:`, err)
    }
  }
}
