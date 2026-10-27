// Moodboard images.
// POST   multipart: project (slug), file  → { file: { id, thumb, full } }
// DELETE { project, id }                  → removes one of your own images
import { NextRequest } from 'next/server'
import { getPayloadClient } from '@/lib/payload'
import { getClient } from '@/lib/client-session'
import { findClientProject } from '@/lib/portal'
import { json, portalRequest } from '@/lib/portal-api'
import { MOODBOARD_MAX, UPLOAD_MAX_BYTES, planLocked } from '@/lib/plan'
import { rateLimit } from '@/lib/security'

const TYPES = new Set(['image/jpeg', 'image/png', 'image/webp', 'image/gif'])

export async function POST(req: NextRequest) {
  const client = await getClient()
  if (!client) return json({ error: 'Not signed in' }, 401)
  if (!rateLimit(`upload:${client.id}`, 60, 10 * 60 * 1000)) return json({ error: 'Too many uploads' }, 429)
  if (Number(req.headers.get('content-length') ?? 0) > UPLOAD_MAX_BYTES + 64 * 1024) return json({ error: 'File too large' }, 413)

  const form = await req.formData().catch(() => null)
  const slug = String(form?.get('project') ?? '').slice(0, 120)
  const file = form?.get('file')
  if (!(file instanceof File)) return json({ error: 'No file' }, 400)
  if (!TYPES.has(file.type) || file.size > UPLOAD_MAX_BYTES) return json({ error: 'Not an image or too large' }, 400)

  const project = slug ? await findClientProject(client, slug) : null
  if (!project) return json({ error: 'Not found' }, 404)
  if (planLocked(project)) return json({ error: 'The plan is read-only now' }, 409)

  const payload = await getPayloadClient()
  const count = await payload.count({ collection: 'project-files', where: { project: { equals: project.id } }, overrideAccess: true })
  if (count.totalDocs >= MOODBOARD_MAX) return json({ error: 'Moodboard is full' }, 409)

  try {
    const created = await payload.create({
      collection: 'project-files',
      data: { project: project.id, client: client.id, kind: 'moodboard' },
      file: { data: Buffer.from(await file.arrayBuffer()), mimetype: file.type, name: file.name.slice(0, 120) || 'image', size: file.size },
      overrideAccess: true,
    })
    return json({ file: { id: created.id, mine: true, thumb: `/api/portal/files/${created.id}/thumb`, full: `/api/portal/files/${created.id}/full` } })
  } catch (err) {
    console.error('[files] upload failed:', err)
    return json({ error: 'The image could not be read' }, 400)
  }
}

export async function DELETE(req: NextRequest) {
  const r = await portalRequest(req, 60)
  if (r instanceof Response) return r
  const { client, project, body } = r
  if (planLocked(project)) return json({ error: 'The plan is read-only now' }, 409)
  const id = Number.isInteger(body.id) ? (body.id as number) : null
  if (!id) return json({ error: 'Invalid file' }, 400)
  const payload = await getPayloadClient()
  const res = await payload.delete({
    collection: 'project-files',
    where: { and: [{ id: { equals: id } }, { project: { equals: project.id } }, { client: { equals: client.id } }] },
    overrideAccess: true,
  })
  return res.docs.length ? json({ ok: true }) : json({ error: 'Not found' }, 404)
}
