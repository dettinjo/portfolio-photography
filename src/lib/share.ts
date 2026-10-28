// Guest links to a delivered gallery. A link works while it is not revoked and
// the gallery is online; downloads (web size only) also need the client's
// permission on the link and a settled balance.
import 'server-only'
import { randomBytes } from 'node:crypto'
import type { Payload } from 'payload'
import type { Project, ShareLink } from '@/payload-types'
import { deliveryOpen } from '@/lib/delivery'
import { downloadsLocked } from '@/lib/billing'

export const MAX_LINKS = 20
/** Guests see the finals at most this wide */
export const GUEST_MAX_WIDTH = 1600

export const isToken = (v: unknown): v is string => typeof v === 'string' && /^[A-Za-z0-9_-]{20,64}$/.test(v)
export const newToken = () => randomBytes(24).toString('base64url')

export interface Share {
  link: ShareLink
  project: Project
  canDownload: boolean
  /** The balance is open: view at screen size only */
  locked: boolean
}

export async function resolveShare(payload: Payload, token: unknown): Promise<Share | null> {
  if (!isToken(token)) return null
  const res = await payload.find({ collection: 'share-links', where: { token: { equals: token } }, limit: 1, depth: 0, overrideAccess: true })
  const link = res.docs[0]
  if (!link || link.revokedAt) return null
  const projectId = typeof link.project === 'object' ? link.project.id : link.project
  const project = await payload.findByID({ collection: 'projects', id: projectId, depth: 0, overrideAccess: true }).catch(() => null)
  if (!project || !deliveryOpen(project)) return null
  const locked = await downloadsLocked(payload, project)
  return { link, project, locked, canDownload: Boolean(link.downloads) && !locked }
}

export const sharePath = (token: string) => `/s/${token}`
