// All delivered photos as one ZIP, streamed while it is built:
// /api/portal/download-all/<project slug>/<original|web>.
import { type NextRequest } from 'next/server'
import { getPayloadClient } from '@/lib/payload'
import { projectViewer } from '@/lib/project-access'
import { deliveryOpen } from '@/lib/delivery'
import { downloadsLocked } from '@/lib/billing'
import { attachment } from '@/lib/download'
import { finalFiles, zipStream, type Variant } from '@/lib/finals'

type Params = { params: Promise<{ project: string; variant: string }> }
// The finals can be viewed, but downloads wait for the balance
const balanceDue = () => new Response('The downloads open once the balance is paid', { status: 402, headers: { 'Cache-Control': 'no-store' } })
const notFound = () => new Response('Not found', { status: 404, headers: { 'Cache-Control': 'no-store' } })

export async function GET(req: NextRequest, { params }: Params) {
  const { project: slug, variant } = await params
  if (!/^[a-z0-9-]{1,120}$/.test(slug) || !['original', 'web'].includes(variant)) return notFound()

  const payload = await getPayloadClient()
  const found = await payload.find({ collection: 'projects', where: { slug: { equals: slug } }, limit: 1, depth: 0, overrideAccess: true })
  const project = found.docs[0]
  if (!project) return notFound()
  const viewer = await projectViewer(req, project.id)
  if (!viewer || (!viewer.admin && !deliveryOpen(project))) return notFound()
  if (!viewer.admin && (await downloadsLocked(payload, project))) return balanceDue()

  const files = await finalFiles(payload, project.id, variant as Variant)
  if (!files.length) return notFound()

  if (viewer.client) {
    await payload.create({
      collection: 'activity',
      data: { project: project.id, actor: 'client', client: viewer.client.id, verb: 'note', message: `${viewer.client.name} downloaded all photos (${variant}, ${files.length} files)` },
      overrideAccess: true,
    })
  }

  return new Response(zipStream(files), {
    headers: {
      'Content-Type': 'application/zip',
      'Content-Disposition': attachment(`${slug}${variant === 'web' ? '-web' : ''}.zip`),
      'Cache-Control': 'private, no-store',
    },
  })
}
