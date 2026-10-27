// Keeps Series and Photos in Payload in sync with Nextcloud → Lightroom/Portfolio.
//
// - Each folder below the portfolio folder is a Series, each image file a Photo.
//   Both are identified by their Nextcloud file id, so renames and moves keep
//   their history.
// - New or re-exported files (changed etag) are downloaded and processed;
//   files that disappear are marked "missing" (hidden), never deleted.
// - Work runs strictly one task at a time in this process. Webhook events are
//   debounced per folder; a full reconcile runs at startup and every 15 minutes
//   and repairs anything a lost event or a failure left behind.
import 'server-only'
import type { Payload } from 'payload'
import { getPayloadClient } from '@/lib/payload'
import {
  PORTFOLIO_DAV_PATH,
  downloadFile,
  listFolder,
  nextcloudConfigured,
  slugify,
  type DavEntry,
} from '@/lib/nextcloud'
import { hasProcessedFiles, processPhoto, removeOtherVersions } from './process'
import { debounce, idle as queueIdle } from './queue'
import { reconcileClients } from './clients'

const IMAGE_TYPES = new Set(['image/jpeg', 'image/png', 'image/webp', 'image/tiff'])
const RECONCILE_INTERVAL_MS = 15 * 60 * 1000
const DEBOUNCE_MS = Number(process.env.SYNC_DEBOUNCE_MS ?? 60_000)

/** Sync one series folder after things have been quiet for a while. */
export function scheduleFolderSync(folderPath: string, delay = DEBOUNCE_MS) {
  debounce(`folder:${folderPath}`, delay, `sync ${folderPath}`, async () => {
    const payload = await getPayloadClient()
    await syncFolder(payload, folderPath)
  })
}

/** Full reconcile of all series folders. */
export function scheduleReconcile(delay = DEBOUNCE_MS) {
  debounce('reconcile', delay, 'reconcile', async () => {
    await reconcile(await getPayloadClient())
  })
}

/** Waits until all queued work is done (used by tests and the manual trigger). */
export const idle = queueIdle

let started = false
/** Starts the periodic reconcile. Safe to call more than once. */
export function startSync() {
  if (started || !nextcloudConfigured() || process.env.SYNC_DISABLED === 'true') return
  started = true
  scheduleReconcile(5_000)
  setInterval(() => scheduleReconcile(0), RECONCILE_INTERVAL_MS).unref()
  console.log('[sync] Nextcloud sync started')
}

// ── Reconcile ─────────────────────────────────────────────────────────────

export async function reconcile(payload: Payload) {
  const errors: string[] = []
  const root = await listFolder(PORTFOLIO_DAV_PATH)
  const folders = root.filter((e) => e.isCollection && e.path !== PORTFOLIO_DAV_PATH)

  for (const folder of folders) {
    try {
      errors.push(...(await syncFolder(payload, folder.path)))
    } catch (err) {
      errors.push(`${folder.path}: ${(err as Error).message}`)
    }
  }

  // Series whose folder is gone
  const seen = folders.map((f) => f.fileId).filter((id): id is number => id !== null)
  const gone = await payload.find({
    collection: 'series',
    where: { and: [{ ncFileId: { not_in: seen.length ? seen : [-1] } }, { missing: { not_equals: true } }] },
    limit: 0,
    pagination: false,
    depth: 0,
  })
  for (const s of gone.docs) await markSeriesMissing(payload, s.id)

  // Client projects: previews in Clients/<project>/1 Preview
  try {
    errors.push(...(await reconcileClients(payload)))
  } catch (err) {
    errors.push(`clients: ${(err as Error).message}`)
  }

  await writeStatus(payload, {
    lastReconcileAt: new Date().toISOString(),
    lastResult: await summary(payload),
    errors: errors.slice(0, 20).join('\n'),
  })
}

async function summary(payload: Payload) {
  const count = async (status: string) =>
    (await payload.count({ collection: 'photos', where: { status: { equals: status } } })).totalDocs
  const series = (await payload.count({ collection: 'series', where: { missing: { not_equals: true } } })).totalDocs
  return `${series} series · ${await count('ready')} photos ready · ${await count('pending')} pending · ${await count('failed')} failed · ${await count('missing')} missing`
}

async function writeStatus(payload: Payload, data: Record<string, unknown>) {
  await payload.updateGlobal({ slug: 'sync-status', data })
}

export async function recordWebhook(payload: Payload) {
  await writeStatus(payload, { lastWebhookAt: new Date().toISOString() })
}

// ── Folder → Series ───────────────────────────────────────────────────────

const folderTitle = (name: string) => name.replace(/^_+/, '').trim() || name

async function uniqueSlug(payload: Payload, base: string, ownId?: number) {
  const root = base || 'series'
  for (let i = 0; ; i++) {
    const slug = i === 0 ? root : `${root}-${i + 1}`
    const hit = await payload.find({
      collection: 'series',
      where: { slug: { equals: slug } },
      limit: 1,
      depth: 0,
    })
    if (!hit.docs[0] || hit.docs[0].id === ownId) return slug
  }
}

/** Syncs one series folder. Returns per-file error messages. */
export async function syncFolder(payload: Payload, folderPath: string): Promise<string[]> {
  const entries = await listFolder(folderPath)
  const folder = entries.find((e) => e.path === folderPath && e.isCollection)
  if (!folder?.fileId) {
    // Folder vanished; reconcile will mark it missing
    return []
  }

  const series = await upsertSeries(payload, folder)
  const files = entries.filter((e) => !e.isCollection && IMAGE_TYPES.has(e.contentType) && e.fileId)
  const errors: string[] = []

  for (const file of files) {
    try {
      await syncFile(payload, file, series.id)
    } catch (err) {
      errors.push(`${file.path}: ${(err as Error).message}`)
    }
  }

  // Files no longer in this folder (deleted or moved elsewhere)
  const present = files.map((f) => f.fileId as number)
  const vanished = await payload.find({
    collection: 'photos',
    where: {
      and: [
        { series: { equals: series.id } },
        { ncFileId: { not_in: present.length ? present : [-1] } },
        { status: { not_equals: 'missing' } },
      ],
    },
    limit: 0,
    pagination: false,
    depth: 0,
  })
  for (const p of vanished.docs) {
    await payload.update({ collection: 'photos', id: p.id, data: { status: 'missing' } })
  }

  await payload.update({
    collection: 'series',
    id: series.id,
    data: { photoCount: files.length },
  })
  return errors
}

async function upsertSeries(payload: Payload, folder: DavEntry) {
  const existing = await payload.find({
    collection: 'series',
    where: { ncFileId: { equals: folder.fileId } },
    limit: 1,
    depth: 0,
  })
  const draft = folder.name.startsWith('_')
  const title = folderTitle(folder.name)

  const current = existing.docs[0]
  if (!current) {
    return payload.create({
      collection: 'series',
      data: {
        title,
        slug: await uniqueSlug(payload, slugify(title)),
        draft,
        ncFileId: folder.fileId,
        ncPath: folder.path,
        missing: false,
      },
    })
  }

  if (current.ncPath === folder.path && !current.missing) return current

  // Folder renamed (or back after missing): follow the new name for the draft
  // flag, and for the title unless it was edited manually.
  const renamed = current.ncPath !== folder.path
  const previousTitle = current.ncPath ? folderTitle(current.ncPath.split('/').pop() ?? '') : null
  const followsFolder = !current.title || current.title === previousTitle
  return payload.update({
    collection: 'series',
    id: current.id,
    data: {
      ncPath: folder.path,
      missing: false,
      ...(renamed && { draft }),
      ...(renamed && followsFolder && { title }),
    },
  })
}

async function markSeriesMissing(payload: Payload, seriesId: number) {
  await payload.update({ collection: 'series', id: seriesId, data: { missing: true } })
  const photos = await payload.find({
    collection: 'photos',
    where: { and: [{ series: { equals: seriesId } }, { status: { not_equals: 'missing' } }] },
    limit: 0,
    pagination: false,
    depth: 0,
  })
  for (const p of photos.docs) {
    await payload.update({ collection: 'photos', id: p.id, data: { status: 'missing' } })
  }
}

// ── File → Photo ──────────────────────────────────────────────────────────

const versionOf = (etag: string | null) => (etag ?? 'v0').toLowerCase().replace(/[^a-z0-9]/g, '').slice(0, 40) || 'v0'

async function syncFile(payload: Payload, file: DavEntry, seriesId: number) {
  const existing = await payload.find({
    collection: 'photos',
    where: { ncFileId: { equals: file.fileId } },
    limit: 1,
    depth: 0,
  })
  const version = versionOf(file.etag)
  let photo = existing.docs[0]

  if (!photo) {
    photo = await payload.create({
      collection: 'photos',
      data: {
        filename: file.name,
        ncFileId: file.fileId as number,
        ncPath: file.path,
        series: seriesId,
        status: 'pending',
      },
    })
  }

  const seriesValue = typeof photo.series === 'object' ? photo.series?.id : photo.series
  const moved = photo.ncPath !== file.path || seriesValue !== seriesId
  const needsProcessing =
    photo.version !== version ||
    photo.status === 'pending' ||
    photo.status === 'failed' ||
    photo.purpose === 'preview' ||
    // processed files lost (e.g. volume replaced) — regenerate them
    !hasProcessedFiles(file.fileId as number, version)

  if (!needsProcessing) {
    if (moved || photo.status === 'missing') {
      await payload.update({
        collection: 'photos',
        id: photo.id,
        data: { ncPath: file.path, filename: file.name, series: seriesId, status: 'ready', purpose: 'portfolio', project: null },
      })
    }
    return
  }

  try {
    const buffer = await downloadFile(file.path)
    const result = await processPhoto(buffer, file.fileId as number, version)
    await payload.update({
      collection: 'photos',
      id: photo.id,
      data: {
        filename: file.name,
        ncPath: file.path,
        series: seriesId,
        purpose: 'portfolio',
        project: null,
        etag: file.etag,
        version,
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
    })
    await removeOtherVersions(file.fileId as number, version)
  } catch (err) {
    await payload.update({
      collection: 'photos',
      id: photo.id,
      data: { status: 'failed', error: (err as Error).message.slice(0, 500), series: seriesId, ncPath: file.path },
    })
    throw err
  }
}
