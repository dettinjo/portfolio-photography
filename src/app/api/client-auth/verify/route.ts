// Second half of the sign-in link: the link opens a page with a button that
// posts here (so link scanners in mail clients cannot use up the token).
import { NextRequest, NextResponse } from 'next/server'
import { getPayloadClient } from '@/lib/payload'
import { consumeLoginToken } from '@/lib/client-tokens'
import { SESSION_COOKIE, encodeSession, sessionCookieOptions } from '@/lib/client-session'
import { clientIp, rateLimit } from '@/lib/security'

export async function POST(req: NextRequest) {
  const form = await req.formData().catch(() => null)
  const token = String(form?.get('token') ?? '')
  const prefix = form?.get('locale') === 'de' ? '/de' : ''
  const back = (path: string) => redirect(`${prefix}${path}`)

  if (!rateLimit(`verify:${clientIp(req)}`, 20, 10 * 60 * 1000)) return back('/c/login?error=expired')

  const payload = await getPayloadClient()
  const client = await consumeLoginToken(payload, token)
  if (!client) return back('/c/login?error=expired')

  const projects = await payload.find({
    collection: 'projects',
    where: { clients: { in: [client.id] } },
    limit: 0,
    pagination: false,
    depth: 0,
    overrideAccess: true,
  })
  for (const p of projects.docs) {
    await payload.create({
      collection: 'activity',
      data: { project: p.id, actor: 'client', client: client.id, verb: 'client.login', message: `${client.name} signed in` },
      overrideAccess: true,
    })
  }

  // Continue in the client's own language
  const res = redirect(`${client.locale === 'de' ? '/de' : ''}/c`)
  res.cookies.set(SESSION_COOKIE, encodeSession(client), sessionCookieOptions)
  return res
}

// Relative Location: correct behind the reverse proxy, whatever host Next sees
const redirect = (path: string) => new NextResponse(null, { status: 303, headers: { Location: path } })
