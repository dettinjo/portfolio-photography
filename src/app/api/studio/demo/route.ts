// TEMPORARY: demo data for trying the site (see lib/demo).
// JSON { action: 'seed' | 'remove' }, or a form post { action: 'open', client }
// that signs this browser in as a demo client and opens their portal.
import { NextRequest, NextResponse } from 'next/server'
import { requireAdminApi } from '@/lib/studio'
import { getPayloadClient } from '@/lib/payload'
import { DEMO_MARK, removeDemo, seedDemo } from '@/lib/demo'
import { SESSION_COOKIE, encodeSession, sessionCookieOptions } from '@/lib/client-session'

export const maxDuration = 300

export async function POST(req: NextRequest) {
  const user = await requireAdminApi(req)
  if (user instanceof NextResponse) return user
  const payload = await getPayloadClient()

  if (req.headers.get('content-type')?.includes('form')) {
    const form = await req.formData()
    const id = Number(form.get('client'))
    const client = Number.isInteger(id) ? await payload.findByID({ collection: 'clients', id, depth: 0, overrideAccess: true }).catch(() => null) : null
    // Only demo clients — never a way into a real client's account
    if (form.get('action') !== 'open' || !client || client.notes !== DEMO_MARK) return NextResponse.json({ error: 'Not a demo client' }, { status: 400 })
    // Relative, like the sign-in route: the request URL is the internal one behind the proxy
    const res = new NextResponse(null, { status: 303, headers: { Location: `${client.locale === 'de' ? '/de' : ''}/c` } })
    res.cookies.set(SESSION_COOKIE, encodeSession(client), sessionCookieOptions)
    return res
  }

  const body = await req.json().catch(() => ({}))
  try {
    if (body.action === 'seed') return NextResponse.json({ ok: true, ...(await seedDemo(payload)) })
    if (body.action === 'remove') return NextResponse.json({ ok: true, ...(await removeDemo(payload)) })
  } catch (err) {
    console.error('[demo] failed:', err)
    return NextResponse.json({ error: (err as Error).message }, { status: 400 })
  }
  return NextResponse.json({ error: 'Unknown action' }, { status: 400 })
}
