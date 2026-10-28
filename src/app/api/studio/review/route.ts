// Approve (publish) or hide a review: { id, approve }.
import { NextRequest, NextResponse } from 'next/server'
import { requireAdminApi } from '@/lib/studio'
import { getPayloadClient } from '@/lib/payload'

export async function POST(req: NextRequest) {
  const user = await requireAdminApi(req)
  if (user instanceof NextResponse) return user
  const body = await req.json().catch(() => ({}))
  if (!Number.isInteger(body.id) || typeof body.approve !== 'boolean') return NextResponse.json({ error: 'Invalid request' }, { status: 400 })
  const payload = await getPayloadClient()
  await payload.update({ collection: 'reviews', id: body.id, data: { approved: body.approve }, overrideAccess: true })
  return NextResponse.json({ ok: true })
}
