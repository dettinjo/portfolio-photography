// Turn an inquiry into a project (client, offering, date and place are taken over): { id }.
import { NextRequest, NextResponse } from 'next/server'
import { requireAdminApi } from '@/lib/studio'
import { getPayloadClient } from '@/lib/payload'

export async function POST(req: NextRequest) {
  const user = await requireAdminApi(req)
  if (user instanceof NextResponse) return user
  const body = await req.json().catch(() => ({}))
  if (!Number.isInteger(body.id)) return NextResponse.json({ error: 'Invalid inquiry' }, { status: 400 })
  const payload = await getPayloadClient()
  const existing = await payload.find({ collection: 'projects', where: { inquiry: { equals: body.id } }, limit: 1, depth: 0, overrideAccess: true })
  if (existing.docs[0]) return NextResponse.json({ ok: true, project: existing.docs[0].id, existed: true })
  const project = await payload.create({ collection: 'projects', data: { inquiry: body.id } as never, user, overrideAccess: true })
  await payload.update({ collection: 'inquiries', id: body.id, data: { status: 'replied' }, overrideAccess: true })
  return NextResponse.json({ ok: true, project: project.id })
}
