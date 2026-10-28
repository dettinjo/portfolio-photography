// Quick project actions: { id, action: 'stage' | 'invite' | 'sync' | 'balance', stage?, paid? }.
// They go through the normal Projects hooks (activity, emails, sync).
import { NextRequest, NextResponse } from 'next/server'
import { requireAdminApi } from '@/lib/studio'
import { getPayloadClient } from '@/lib/payload'
import { isStage } from '@/lib/stages'

export async function POST(req: NextRequest) {
  const user = await requireAdminApi(req)
  if (user instanceof NextResponse) return user
  const body = await req.json().catch(() => ({}))
  if (!Number.isInteger(body.id)) return NextResponse.json({ error: 'Invalid project' }, { status: 400 })
  const payload = await getPayloadClient()
  // Balance paid by hand (bank transfer, cash) — or undone
  if (body.action === 'balance' && typeof body.paid === 'boolean') {
    const project = await payload.findByID({ collection: 'projects', id: body.id, depth: 0, overrideAccess: true }).catch(() => null)
    if (!project) return NextResponse.json({ error: 'Invalid project' }, { status: 400 })
    await payload.update({
      collection: 'projects',
      id: project.id,
      data: { billing: { ...project.billing, balancePaidAt: body.paid ? new Date().toISOString() : null } },
      user,
      overrideAccess: true,
    })
    return NextResponse.json({ ok: true })
  }
  const data =
    body.action === 'stage' && isStage(body.stage)
      ? { stage: body.stage }
      : body.action === 'invite'
        ? { inviteClients: true }
        : body.action === 'sync'
          ? { syncPreviews: true }
          : null
  if (!data) return NextResponse.json({ error: 'Unknown action' }, { status: 400 })
  try {
    const doc = await payload.update({ collection: 'projects', id: body.id, data, user, overrideAccess: true })
    return NextResponse.json({ ok: true, stage: doc.stage })
  } catch (err) {
    return NextResponse.json({ error: (err as Error).message }, { status: 400 })
  }
}
