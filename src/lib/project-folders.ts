// Nextcloud folders for a client project:
//   Clients/<yyyy-mm-dd> <slug>/{1 Preview, 2 Final, _from-client}
// Lightroom publishes previews and finals into them; the site writes the
// client's selection back to _from-client.
import 'server-only'
import { CLIENTS_DAV_PATH, createFolder, nextcloudConfigured } from '@/lib/nextcloud'

export const PROJECT_SUBFOLDERS = ['1 Preview', '2 Final', '_from-client'] as const

export function projectFolderName(slug: string, shootDate?: string | null) {
  const date = shootDate ? shootDate.slice(0, 10) : null
  // The slug starts with the date already when one was set at creation
  const name = date && slug.startsWith(date) ? slug.slice(date.length + 1) : slug
  return date ? `${date} ${name}` : name
}

/** Creates the folders and returns their path relative to the sync account. */
export async function ensureProjectFolders(slug: string, shootDate?: string | null): Promise<string> {
  if (!nextcloudConfigured()) throw new Error('Nextcloud is not configured')
  const root = `${CLIENTS_DAV_PATH}/${projectFolderName(slug, shootDate)}`
  try {
    await createFolder(root)
  } catch (err) {
    if ((err as Error).message.includes('parent folder missing')) {
      throw new Error(
        `"${CLIENTS_DAV_PATH}" is missing for the sync account — share Lightroom/Clients with it (read, edit, create).`,
      )
    }
    throw err
  }
  for (const sub of PROJECT_SUBFOLDERS) await createFolder(`${root}/${sub}`)
  return root
}
