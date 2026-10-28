// Web Push (VAPID). Best effort: a failed push never breaks the action that
// caused it, and subscriptions the browser has dropped (404/410) are removed.
import 'server-only'
import webpush from 'web-push'
import type { Where } from 'payload'
import type { Client, Project } from '@/payload-types'
import { getPayloadClient } from '@/lib/payload'

const PUBLIC = process.env.VAPID_PUBLIC_KEY ?? ''
const PRIVATE = process.env.VAPID_PRIVATE_KEY ?? ''
const SUBJECT = process.env.VAPID_SUBJECT ?? 'mailto:admin@joeldettinger.de'

export const pushEnabled = () => Boolean(PUBLIC && PRIVATE)
export const vapidPublicKey = () => PUBLIC

let configured = false
function configure() {
  if (!configured && pushEnabled()) {
    webpush.setVapidDetails(SUBJECT, PUBLIC, PRIVATE)
    configured = true
  }
  return configured
}

export interface PushMessage {
  title: string
  body: string
  /** Path to open when the notification is tapped */
  url: string
  /** Notifications with the same tag replace each other */
  tag?: string
}

async function sendTo(where: Where, message: PushMessage | ((locale: 'en' | 'de') => PushMessage)) {
  if (!configure()) return 0
  const payload = await getPayloadClient()
  const subs = await payload.find({ collection: 'push-subscriptions', where, limit: 100, depth: 0, overrideAccess: true })
  let sent = 0
  await Promise.all(
    subs.docs.map(async (s) => {
      const locale = s.locale === 'de' ? 'de' : 'en'
      const m = typeof message === 'function' ? message(locale) : message
      try {
        await webpush.sendNotification({ endpoint: s.endpoint, keys: { p256dh: s.p256dh, auth: s.auth } }, JSON.stringify(m), { TTL: 60 * 60 * 24, urgency: 'normal' })
        sent++
        await payload.update({ collection: 'push-subscriptions', id: s.id, data: { lastUsedAt: new Date().toISOString() }, overrideAccess: true }).catch(() => {})
      } catch (err) {
        const status = (err as { statusCode?: number }).statusCode
        if (status === 404 || status === 410) {
          await payload.delete({ collection: 'push-subscriptions', id: s.id, overrideAccess: true }).catch(() => {})
        } else {
          console.error('[push] failed:', status ?? (err as Error).message)
        }
      }
    }),
  )
  return sent
}

const relId = (v: unknown) => (typeof v === 'object' && v !== null ? (v as { id: number }).id : (v as number))

/** To every device of the project's clients, in each device's language. */
export async function pushProjectClients(
  project: Pick<Project, 'clients' | 'slug'>,
  text: Record<'en' | 'de', { title: string; body: string }>,
  path: string,
  tag?: string,
) {
  const ids = (project.clients ?? []).map(relId).filter((v): v is number => typeof v === 'number')
  if (!ids.length) return 0
  return sendTo({ client: { in: ids } }, (locale) => ({
    ...text[locale],
    url: `${locale === 'de' ? '/de' : ''}/c/${project.slug}${path}`,
    tag,
  })).catch((err) => {
    console.error('[push] clients failed:', err)
    return 0
  })
}

/** To the photographer's devices. */
export async function pushAdmins(title: string, body: string, url = '/studio', tag?: string) {
  return sendTo({ user: { exists: true } }, { title, body, url, tag }).catch((err) => {
    console.error('[push] admins failed:', err)
    return 0
  })
}

export type { Client }
