// Push subscriptions for clients (portal session) and the photographer (admin login).
// GET    → { enabled, key }
// POST   { subscription: PushSubscriptionJSON, locale? } → store or refresh
// DELETE { endpoint } → remove
import { NextRequest, NextResponse } from 'next/server'
import { getPayloadClient } from '@/lib/payload'
import { getClient } from '@/lib/client-session'
import { pushEnabled, vapidPublicKey } from '@/lib/push'
import { rateLimit, clientIp, singleLine } from '@/lib/security'

const json = (body: unknown, status = 200) => NextResponse.json(body, { status })

async function owner(req: NextRequest) {
  const payload = await getPayloadClient()
  const { user } = await payload.auth({ headers: req.headers }).catch(() => ({ user: null }))
  if (user) return { payload, user: user.id as number, client: null }
  const client = await getClient()
  return client ? { payload, user: null, client: client.id } : null
}

const validEndpoint = (v: unknown): v is string => typeof v === 'string' && v.length < 1000 && /^https:\/\/[^\s]+$/.test(v)

export async function GET() {
  return json({ enabled: pushEnabled(), key: pushEnabled() ? vapidPublicKey() : null })
}

export async function POST(req: NextRequest) {
  if (!pushEnabled()) return json({ error: 'Push is not configured' }, 503)
  if (!rateLimit(`push:${clientIp(req)}`, 20, 10 * 60 * 1000)) return json({ error: 'Too many requests' }, 429)
  const who = await owner(req)
  if (!who) return json({ error: 'Not signed in' }, 401)
  const body = await req.json().catch(() => null)
  const sub = body?.subscription
  if (!validEndpoint(sub?.endpoint) || typeof sub?.keys?.p256dh !== 'string' || typeof sub?.keys?.auth !== 'string') {
    return json({ error: 'Invalid subscription' }, 400)
  }
  const data = {
    endpoint: sub.endpoint,
    p256dh: String(sub.keys.p256dh).slice(0, 200),
    auth: String(sub.keys.auth).slice(0, 100),
    client: who.client,
    user: who.user,
    device: singleLine(req.headers.get('user-agent'), 160),
    locale: body?.locale === 'de' ? 'de' : 'en',
    lastUsedAt: new Date().toISOString(),
  }
  const existing = await who.payload.find({ collection: 'push-subscriptions', where: { endpoint: { equals: sub.endpoint } }, limit: 1, depth: 0, overrideAccess: true })
  if (existing.docs[0]) await who.payload.update({ collection: 'push-subscriptions', id: existing.docs[0].id, data, overrideAccess: true })
  else await who.payload.create({ collection: 'push-subscriptions', data, overrideAccess: true })
  return json({ ok: true })
}

export async function DELETE(req: NextRequest) {
  const who = await owner(req)
  if (!who) return json({ error: 'Not signed in' }, 401)
  const body = await req.json().catch(() => null)
  if (!validEndpoint(body?.endpoint)) return json({ error: 'Invalid endpoint' }, 400)
  // Only your own device
  await who.payload.delete({
    collection: 'push-subscriptions',
    where: { and: [{ endpoint: { equals: body.endpoint } }, who.client ? { client: { equals: who.client } } : { user: { equals: who.user } }] },
    overrideAccess: true,
  })
  return json({ ok: true })
}
