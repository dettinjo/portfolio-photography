// One photo from the phone: multipart { target, file }.
import { NextRequest, NextResponse } from 'next/server'
import { requireAdminApi } from '@/lib/studio'
import { UPLOAD_MAX_BYTES, UPLOAD_TYPES, putFile, resolveTarget } from '@/lib/studio-upload'

export async function POST(req: NextRequest) {
  const user = await requireAdminApi(req)
  if (user instanceof NextResponse) return user
  const form = await req.formData().catch(() => null)
  const file = form?.get('file')
  const target = await resolveTarget(String(form?.get('target') ?? ''))
  if (!target) return NextResponse.json({ error: 'Unknown target' }, { status: 400 })
  if (!(file instanceof File) || !UPLOAD_TYPES.has(file.type) || file.size > UPLOAD_MAX_BYTES) {
    return NextResponse.json({ error: 'JPEG, PNG, WebP or TIFF up to 60 MB' }, { status: 400 })
  }
  try {
    await putFile(target, file.name, Buffer.from(await file.arrayBuffer()), file.type)
  } catch (err) {
    return NextResponse.json({ error: (err as Error).message }, { status: 502 })
  }
  // Sync once the batch is quiet (the debounce merges the calls)
  target.sync()
  return NextResponse.json({ ok: true, folder: target.label })
}
