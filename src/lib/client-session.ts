// Client portal sessions: a signed, HTTP-only cookie holding the client id and
// their session version. Bumping the version (admin: "sign out everywhere")
// ends every session of that client.
import 'server-only'
import { createHmac, timingSafeEqual } from 'node:crypto'
import { cookies } from 'next/headers'
import type { Client } from '@/payload-types'
import { getPayloadClient } from '@/lib/payload'

export const SESSION_COOKIE = 'client_session'
export const SESSION_MAX_AGE = 60 * 60 * 24 * 30 // 30 days

interface SessionData {
  c: number // client id
  v: number // session version
  e: number // expiry (ms)
}

const secret = () => {
  const s = process.env.PAYLOAD_SECRET
  if (!s) throw new Error('PAYLOAD_SECRET is not set')
  return `${s}:client-session`
}

const sign = (value: string) => createHmac('sha256', secret()).update(value).digest('base64url')

export function encodeSession(client: Pick<Client, 'id' | 'sessionVersion'>): string {
  const data: SessionData = { c: client.id, v: client.sessionVersion ?? 1, e: Date.now() + SESSION_MAX_AGE * 1000 }
  const body = Buffer.from(JSON.stringify(data)).toString('base64url')
  return `${body}.${sign(body)}`
}

function decodeSession(value: string | undefined): SessionData | null {
  if (!value) return null
  const [body, mac] = value.split('.')
  if (!body || !mac) return null
  const expected = Buffer.from(sign(body))
  const given = Buffer.from(mac)
  if (expected.length !== given.length || !timingSafeEqual(expected, given)) return null
  try {
    const data = JSON.parse(Buffer.from(body, 'base64url').toString()) as SessionData
    return Number.isInteger(data.c) && data.e > Date.now() ? data : null
  } catch {
    return null
  }
}

export const sessionCookieOptions = {
  httpOnly: true,
  secure: process.env.NODE_ENV === 'production',
  sameSite: 'lax' as const,
  path: '/',
  maxAge: SESSION_MAX_AGE,
}

/** The signed-in client, or null. */
export async function getClient(): Promise<Client | null> {
  const data = decodeSession((await cookies()).get(SESSION_COOKIE)?.value)
  if (!data) return null
  const payload = await getPayloadClient()
  const client = await payload
    .findByID({ collection: 'clients', id: data.c, depth: 0, overrideAccess: true, showHiddenFields: true })
    .catch(() => null)
  if (!client || (client.sessionVersion ?? 1) !== data.v) return null
  return client
}
