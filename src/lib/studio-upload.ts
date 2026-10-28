// Phone uploads from /studio go into Nextcloud — Nextcloud stays the single
// drop zone — and the matching sync runs right after.
import 'server-only'
import path from 'path'
import { getPayloadClient } from '@/lib/payload'
import { PORTFOLIO_DAV_PATH, createFolder, uploadFile } from '@/lib/nextcloud'
import { scheduleFolderSync } from '@/lib/sync'
import { scheduleProjectSync } from '@/lib/sync/clients'

export const UPLOAD_TYPES = new Set(['image/jpeg', 'image/png', 'image/webp', 'image/tiff'])
export const UPLOAD_MAX_BYTES = 60 * 1024 * 1024

export interface ResolvedTarget {
  folder: string
  label: string
  sync: () => void
}

/** "project:<id>:preview|final", "series:<id>" or "newseries:<name>" → a Nextcloud folder. */
export async function resolveTarget(value: string): Promise<ResolvedTarget | null> {
  const payload = await getPayloadClient()
  let m = value.match(/^project:(\d+):(preview|final)$/)
  if (m) {
    const project = await payload.findByID({ collection: 'projects', id: Number(m[1]), depth: 0, overrideAccess: true }).catch(() => null)
    if (!project) return null
    if (!project.ncFolder) {
      // A brand-new project whose folder isn't there yet: create it now
      try {
        const { ensureProjectFolders } = await import('@/lib/project-folders')
        project.ncFolder = await ensureProjectFolders(project.slug ?? String(project.id), project.shootDate)
        await payload.update({ collection: 'projects', id: project.id, data: { ncFolder: project.ncFolder, ncFolderError: null }, context: { skipFolders: true }, overrideAccess: true })
      } catch {
        return null
      }
    }
    const sub = m[2] === 'preview' ? '1 Preview' : '2 Final'
    return { folder: `${project.ncFolder}/${sub}`, label: `${project.title} / ${sub}`, sync: () => scheduleProjectSync(project.id, 5000) }
  }
  m = value.match(/^series:(\d+)$/)
  if (m) {
    const series = await payload.findByID({ collection: 'series', id: Number(m[1]), depth: 0, overrideAccess: true }).catch(() => null)
    if (!series?.ncPath) return null
    return { folder: series.ncPath, label: `Portfolio / ${series.title}`, sync: () => scheduleFolderSync(series.ncPath as string, 5000) }
  }
  m = value.match(/^newseries:(.{1,80})$/)
  if (m) {
    // A leading "_" keeps a new series as a draft, like in Nextcloud
    const name = m[1].replace(/[\\/:*?"<>|]/g, '').trim()
    if (!name) return null
    const folder = `${PORTFOLIO_DAV_PATH}/${name}`
    return { folder, label: `Portfolio / ${name} (new)`, sync: () => scheduleFolderSync(folder, 5000) }
  }
  return null
}

export const safeName = (name: string) =>
  path.basename(name).replace(/[\\/:*?"<>|\x00-\x1f]/g, '_').slice(0, 120) || `upload-${Date.now()}.jpg`

/** Writes one file; explains the usual failure (the share is read-only). */
export async function putFile(target: ResolvedTarget, name: string, data: Buffer, type: string) {
  try {
    await createFolder(target.folder)
    await uploadFile(`${target.folder}/${safeName(name)}`, data, type)
  } catch (err) {
    const msg = (err as Error).message
    if (/40[13]|no write access/.test(msg)) {
      throw new Error(`No write access to "${target.folder}" — give the sync account "edit" and "create" on that shared folder in Nextcloud.`)
    }
    throw err
  }
}
