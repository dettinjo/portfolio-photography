// "Send my selection": locks the picks, writes selection.txt/.csv to the
// project's _from-client folder in Nextcloud, moves the project to Editing and
// sends both emails. { project: slug }
import { NextRequest } from 'next/server'
import { getPayloadClient } from '@/lib/payload'
import { isLocked, json, portalRequest } from '@/lib/portal-api'
import { getProofing } from '@/lib/portal'
import { selectionFiles } from '@/lib/selection-files'
import { createFolder, uploadFile } from '@/lib/nextcloud'
import { isStage, stageIndex } from '@/lib/stages'
import { siteUrl } from '@/lib/client-tokens'
import { sendSelectionConfirmation, sendSelectionNotification } from '@/lib/email-client'
import { pushAdmins } from '@/lib/push'

export async function POST(req: NextRequest) {
  const r = await portalRequest(req, 10)
  if (r instanceof Response) return r
  const { client, project } = r
  if (isLocked(project)) return json({ error: 'Selection already sent' }, 409)

  const proofing = await getProofing(client, project.slug as string)
  if (!proofing) return json({ error: 'Not found' }, 404)
  const sentAt = new Date()
  const files = selectionFiles(proofing, client.name, sentAt)
  if (!files.count) return json({ error: 'Pick at least one photo' }, 400)

  const payload = await getPayloadClient()
  const stage = isStage(project.stage) ? project.stage : 'proofing'
  // Lock first, so a second click cannot send twice
  await payload.update({
    collection: 'projects',
    id: project.id,
    data: {
      proofing: { ...project.proofing, submittedAt: sentAt.toISOString() },
      ...(stageIndex(stage) < stageIndex('editing') && { stage: 'editing' }),
    },
    context: { skipFolders: true },
    overrideAccess: true,
  })

  let writeError: string | null = null
  if (project.ncFolder) {
    try {
      const dir = `${project.ncFolder}/_from-client`
      await createFolder(dir)
      await uploadFile(`${dir}/selection.txt`, files.txt)
      await uploadFile(`${dir}/selection.csv`, files.csv, 'text/csv; charset=utf-8')
    } catch (err) {
      writeError = (err as Error).message
    }
  } else {
    writeError = 'The project has no Nextcloud folder'
  }

  await payload.create({
    collection: 'activity',
    data: {
      project: project.id,
      actor: 'client',
      client: client.id,
      verb: 'note',
      clientVisible: true,
      message: `Selection sent: ${files.count} photos${files.extra ? ` (${files.extra} extra)` : ''}`,
    },
    overrideAccess: true,
  })
  if (writeError) {
    await payload.create({
      collection: 'activity',
      data: { project: project.id, actor: 'system', verb: 'folder', message: `selection.txt not written: ${writeError}` },
      overrideAccess: true,
    })
  }

  const locale = client.locale === 'de' ? 'de' : 'en'
  await Promise.allSettled([
    sendSelectionNotification({
      projectTitle: project.title,
      sentBy: client.name,
      count: files.count,
      extra: files.extra,
      folder: project.ncFolder ?? null,
      writeError,
      selectionText: files.txt,
    }),
    sendSelectionConfirmation({
      to: client.email,
      name: client.name.split(' ')[0],
      locale,
      count: files.count,
      extra: files.extra,
      projectTitle: project.title,
      url: siteUrl(`/c/${project.slug}`, locale),
    }),
  ]).then((results) => results.forEach((res) => res.status === 'rejected' && console.error('[submit] email failed:', res.reason)))

  await pushAdmins('✅ Selection sent', `${project.title}: ${files.count} photos${files.extra ? ` (${files.extra} extra)` : ''}`, `/studio/projects/${project.id}`)
  return json({ ok: true, count: files.count, extra: files.extra })
}
