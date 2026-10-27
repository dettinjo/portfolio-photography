// "Email me a sign-in link" for the client portal. Always answers the same way,
// so the form never reveals whether an address belongs to a client.
import { NextRequest, NextResponse } from 'next/server'
import { getPayloadClient } from '@/lib/payload'
import { clientIp, isEmail, rateLimit, singleLine } from '@/lib/security'
import { LOGIN_LINK_TTL_MS, issueLoginToken, signInUrl } from '@/lib/client-tokens'
import { sendSignInEmail } from '@/lib/email-client'

export async function POST(req: NextRequest) {
  if (!rateLimit(`login:${clientIp(req)}`, 5, 10 * 60 * 1000)) {
    return NextResponse.json({ error: 'Too many requests. Please try again later.' }, { status: 429 })
  }
  let body: Record<string, unknown>
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
  }
  if (body.website) return NextResponse.json({ ok: true })

  const email = singleLine(body.email, 254).toLowerCase()
  if (!isEmail(email)) return NextResponse.json({ error: 'A valid email is required' }, { status: 400 })
  if (!rateLimit(`login-email:${email}`, 3, 10 * 60 * 1000)) return NextResponse.json({ ok: true })

  try {
    const payload = await getPayloadClient()
    const found = await payload.find({
      collection: 'clients',
      where: { email: { equals: email } },
      limit: 1,
      depth: 0,
      overrideAccess: true,
    })
    const client = found.docs[0]
    if (client) {
      const locale = client.locale === 'de' ? 'de' : 'en'
      const token = await issueLoginToken(payload, client.id, LOGIN_LINK_TTL_MS)
      await sendSignInEmail({
        to: client.email,
        name: client.name.split(' ')[0],
        locale,
        url: signInUrl(token, locale),
        kind: 'login',
      })
    }
  } catch (err) {
    console.error('[client-auth] sign-in link failed:', err)
  }
  return NextResponse.json({ ok: true })
}
