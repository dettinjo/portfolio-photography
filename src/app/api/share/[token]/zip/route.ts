// Guest download of the whole gallery in web size, when the link allows it.
import { type NextRequest } from 'next/server'
import { getPayloadClient } from '@/lib/payload'
import { attachment } from '@/lib/download'
import { finalFiles, zipStream } from '@/lib/finals'
import { resolveShare } from '@/lib/share'

type Params = { params: Promise<{ token: string }> }
const notFound = () => new Response('Not found', { status: 404, headers: { 'Cache-Control': 'no-store' } })

export async function GET(_req: NextRequest, { params }: Params) {
  const { token } = await params
  const payload = await getPayloadClient()
  const share = await resolveShare(payload, token)
  if (!share?.canDownload) return notFound()
  const files = await finalFiles(payload, share.project.id, 'web')
  if (!files.length) return notFound()
  await payload.create({
    collection: 'activity',
    data: { project: share.project.id, actor: 'system', verb: 'note', message: `Guest link "${share.link.label}": all photos downloaded (${files.length})` },
    overrideAccess: true,
  })
  return new Response(zipStream(files), {
    headers: {
      'Content-Type': 'application/zip',
      'Content-Disposition': attachment(`${share.project.slug}-web.zip`),
      'Cache-Control': 'private, no-store',
    },
  })
}
