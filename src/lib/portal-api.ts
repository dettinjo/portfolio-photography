// Shared checks for the portal's JSON endpoints.
import 'server-only'
import { NextRequest, NextResponse } from 'next/server'
import type { Client, Project } from '@/payload-types'
import { getClient } from '@/lib/client-session'
import { findClientProject } from '@/lib/portal'
import { rateLimit } from '@/lib/security'

export const json = (body: unknown, status = 200) => NextResponse.json(body, { status })

type Ok = { client: Client; project: Project; body: Record<string, unknown> }

/** Signed-in client + their project (by slug in the body), or an error response. */
export async function portalRequest(req: NextRequest, limit = 300): Promise<Ok | NextResponse> {
  const client = await getClient()
  if (!client) return json({ error: 'Not signed in' }, 401)
  if (!rateLimit(`portal:${client.id}`, limit, 10 * 60 * 1000)) return json({ error: 'Too many requests' }, 429)
  let body: Record<string, unknown>
  try {
    body = await req.json()
  } catch {
    return json({ error: 'Invalid JSON' }, 400)
  }
  const slug = typeof body.project === 'string' ? body.project.slice(0, 120) : ''
  const project = slug ? await findClientProject(client, slug) : null
  if (!project) return json({ error: 'Not found' }, 404)
  return { client, project, body }
}

export const isLocked = (project: Project) => Boolean(project.proofing?.submittedAt)
