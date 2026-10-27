// Who may see a project's private images: signed-in admins and the project's clients.
import 'server-only'
import type { NextRequest } from 'next/server'
import type { Client } from '@/payload-types'
import { getPayloadClient } from '@/lib/payload'
import { getClient } from '@/lib/client-session'

export type Viewer = { admin: true; client: null } | { admin: false; client: Client }

export async function projectViewer(req: NextRequest, projectId: number): Promise<Viewer | null> {
  const payload = await getPayloadClient()
  const { user } = await payload.auth({ headers: req.headers }).catch(() => ({ user: null }))
  if (user) return { admin: true, client: null }
  const client = await getClient()
  if (!client) return null
  const ok = await payload.count({
    collection: 'projects',
    where: { and: [{ id: { equals: projectId } }, { clients: { in: [client.id] } }] },
    overrideAccess: true,
  })
  return ok.totalDocs ? { admin: false, client } : null
}
