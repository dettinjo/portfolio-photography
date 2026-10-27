// Send the collected change requests as one round: { project }
import { NextRequest } from 'next/server'
import { getPayloadClient } from '@/lib/payload'
import { json, portalRequest } from '@/lib/portal-api'
import { canRequest, revisionsFile, roundsOf } from '@/lib/revisions'
import { createFolder, uploadFile } from '@/lib/nextcloud'
import { sendRevisionsRequested } from '@/lib/email-client'

export async function POST(req: NextRequest) {
  const r = await portalRequest(req, 10)
  if (r instanceof Response) return r
  const { client, project } = r
  if (!(await canRequest(project))) return json({ error: 'No revision rounds left' }, 409)

  const payload = await getPayloadClient()
  const drafts = await payload.find({
    collection: 'revisions',
    where: { and: [{ project: { equals: project.id } }, { status: { equals: 'draft' } }] },
    sort: 'createdAt',
    limit: 0,
    pagination: false,
    depth: 1,
    overrideAccess: true,
  })
  if (!drafts.docs.length) return json({ error: 'Nothing to send' }, 400)

  const round = roundsOf(project).used + 1
  const now = new Date().toISOString()
  // Count the round first, so a double click cannot send it twice
  await payload.update({
    collection: 'projects',
    id: project.id,
    data: { revisionRounds: { ...project.revisionRounds, used: round }, stage: 'revisions' },
    context: { skipFolders: true },
    overrideAccess: true,
  })
  const items: { filename: string; body: string; x?: number | null; y?: number | null; author: string }[] = []
  for (const d of drafts.docs) {
    const photo = typeof d.photo === 'object' ? d.photo : null
    await payload.update({
      collection: 'revisions',
      id: d.id,
      data: { status: 'requested', round, requestedAt: now, versionRequested: photo?.version ?? null },
      overrideAccess: true,
    })
    const author = typeof d.client === 'object' && d.client ? d.client.name.split(' ')[0] : client.name.split(' ')[0]
    items.push({ filename: photo?.filename ?? '?', body: d.body, x: d.x, y: d.y, author })
  }

  const text = revisionsFile(project, round, items, client.name)
  let writeError: string | null = null
  if (project.ncFolder) {
    try {
      await createFolder(`${project.ncFolder}/_from-client`)
      await uploadFile(`${project.ncFolder}/_from-client/revisions-round-${round}.txt`, text)
    } catch (err) {
      writeError = (err as Error).message
    }
  }
  await payload.create({
    collection: 'activity',
    data: { project: project.id, actor: 'client', client: client.id, verb: 'note', clientVisible: true, message: `Changes sent (round ${round}): ${items.length}` },
    overrideAccess: true,
  })
  await sendRevisionsRequested({
    projectTitle: project.title,
    client: client.name,
    clientEmail: client.email,
    round,
    text,
    folder: project.ncFolder ?? null,
    writeError,
  }).catch((err) => console.error('[revisions] email failed:', err))
  return json({ ok: true, round, count: items.length })
}
