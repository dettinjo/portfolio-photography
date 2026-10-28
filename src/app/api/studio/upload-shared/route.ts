// Send photos shared from the gallery to a destination: { token, target }.
import { NextRequest, NextResponse } from 'next/server'
import { requireAdminApi } from '@/lib/studio'
import { dropShared, listShared, readShared } from '@/lib/studio-share'
import { putFile, resolveTarget } from '@/lib/studio-upload'

export async function POST(req: NextRequest) {
  const user = await requireAdminApi(req)
  if (user instanceof NextResponse) return user
  const body = await req.json().catch(() => ({}))
  const token = String(body.token ?? '')
  const files = await listShared(token)
  const target = await resolveTarget(String(body.target ?? ''))
  if (!files) return NextResponse.json({ error: 'These photos are gone — share them again' }, { status: 404 })
  if (!target) return NextResponse.json({ error: 'Unknown target' }, { status: 400 })
  let done = 0
  try {
    for (const [i, f] of files.entries()) {
      await putFile(target, f.name, await readShared(token, i), f.type)
      done++
    }
  } catch (err) {
    return NextResponse.json({ error: (err as Error).message, done }, { status: 502 })
  }
  await dropShared(token)
  target.sync()
  return NextResponse.json({ ok: true, done, folder: target.label })
}
