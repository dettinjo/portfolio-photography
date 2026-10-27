// One-time sign-in links for the client portal. Only a hash of the token is
// stored; a token is valid once, until it expires, and a newer link replaces
// an older one. Kept free of Next.js imports so Payload hooks can use it.
import { createHash, randomBytes } from 'node:crypto'
import type { Payload, PayloadRequest } from 'payload'

export const LOGIN_LINK_TTL_MS = 30 * 60 * 1000
export const INVITE_LINK_TTL_MS = 7 * 24 * 60 * 60 * 1000

export const hashToken = (token: string) => createHash('sha256').update(token).digest('hex')

export async function issueLoginToken(
  payload: Payload,
  clientId: number,
  ttlMs: number,
  req?: PayloadRequest,
): Promise<string> {
  const token = randomBytes(32).toString('base64url')
  await payload.update({
    collection: 'clients',
    id: clientId,
    data: { loginTokenHash: hashToken(token), loginTokenExpiresAt: new Date(Date.now() + ttlMs).toISOString() },
    req,
    overrideAccess: true,
  })
  return token
}

/** Checks a token and uses it up. Returns the client, or null if invalid or expired. */
export async function consumeLoginToken(payload: Payload, token: string) {
  if (!/^[A-Za-z0-9_-]{40,60}$/.test(token)) return null
  const found = await payload.find({
    collection: 'clients',
    where: { loginTokenHash: { equals: hashToken(token) } },
    limit: 1,
    depth: 0,
    overrideAccess: true,
    showHiddenFields: true,
  })
  const client = found.docs[0]
  if (!client) return null
  const valid = client.loginTokenExpiresAt && new Date(client.loginTokenExpiresAt).getTime() > Date.now()
  await payload.update({
    collection: 'clients',
    id: client.id,
    data: { loginTokenHash: null, loginTokenExpiresAt: null, ...(valid && { lastLoginAt: new Date().toISOString() }) },
    overrideAccess: true,
  })
  return valid ? client : null
}

const SITE = process.env.NEXT_PUBLIC_PHOTOGRAPHY_DOMAIN
  ? `https://${process.env.NEXT_PUBLIC_PHOTOGRAPHY_DOMAIN}`
  : 'https://photosby.joeldettinger.de'

export const siteUrl = (path: string, locale: 'en' | 'de') => `${SITE}${locale === 'de' ? '/de' : ''}${path}`

export const signInUrl = (token: string, locale: 'en' | 'de') =>
  siteUrl(`/c/login/verify?token=${encodeURIComponent(token)}`, locale)
