// Answer a client from the phone: { project: id, body } (emails + pushes the clients via the Messages hook).
import { NextRequest, NextResponse } from 'next/server'
import { requireAdminApi } from '@/lib/studio'
import { getPayloadClient } from '@/lib/payload'

export async function POST(req: NextRequest) {
  const user = await requireAdminApi(req)
  if (user instanceof NextResponse) return user
  const body = await req.json().catch(() => ({}))
  const text = typeof body.body === 'string' ? body.body.trim().slice(0, 4000) : ''
  if (!Number.isInteger(body.project) || !text) return NextResponse.json({ error: 'Invalid reply' }, { status: 400 })
  const payload = await getPayloadClient()
  const msg = await payload.create({ collection: 'messages', data: { project: body.project, body: text }, overrideAccess: true })
  return NextResponse.json({ ok: true, id: msg.id, at: msg.createdAt })
}
