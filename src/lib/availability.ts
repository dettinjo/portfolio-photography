// Busy days for the inquiry form's calendar (docs/REDESIGN.md §12, Phase 5c).
// Two sources: shoot dates of projects (from Proposal on, archive excluded) and
// an optional private iCal feed (AVAILABILITY_ICS_URL, e.g. a Nextcloud, Google
// or Apple calendar). Only day keys ever leave this module — never titles,
// times or places. Timed events count when they fill at least
// AVAILABILITY_MIN_HOURS (default 4) of a day, so a dentist appointment does
// not block a whole Saturday.
import 'server-only'
import ICAL from 'ical.js'
import { getPayloadClient } from '@/lib/payload'

const TZ = 'Europe/Berlin'
const HOUR = 3_600_000
const TTL = 15 * 60_000
const FEED_TIMEOUT = 8_000

const dayKey = (d: Date) => new Intl.DateTimeFormat('en-CA', { timeZone: TZ, year: 'numeric', month: '2-digit', day: '2-digit' }).format(d)
const minHours = () => Math.max(0.5, Number(process.env.AVAILABILITY_MIN_HOURS) || 4)

export const feedConfigured = () => Boolean(process.env.AVAILABILITY_ICS_URL)

/** Basic auth for the feed: its own credentials, or the Nextcloud sync user on the same host. */
function feedHeaders(url: URL): Record<string, string> {
  // Empty compose variables count as unset
  const user = process.env.AVAILABILITY_ICS_USER || (process.env.NEXTCLOUD_URL && new URL(process.env.NEXTCLOUD_URL).host === url.host ? process.env.NEXTCLOUD_USER : undefined)
  const pass = process.env.AVAILABILITY_ICS_PASSWORD || (user === process.env.NEXTCLOUD_USER ? process.env.NEXTCLOUD_PASSWORD : undefined)
  return user && pass ? { Authorization: `Basic ${Buffer.from(`${user}:${pass}`).toString('base64')}` } : {}
}

/** Days within [from, to) that an iCal text marks as busy. Exported for tests. */
export function busyFromIcs(text: string, from: Date, to: Date, hours = minHours()): Set<string> {
  const busy = new Set<string>()
  const root = new ICAL.Component(ICAL.parse(text))
  for (const tz of root.getAllSubcomponents('vtimezone')) ICAL.TimezoneService.register(tz)

  const mark = (start: ICAL.Time, end: ICAL.Time | null) => {
    if (start.isDate) {
      // All-day: every date from start up to (not including) end
      const last = end && end.compare(start) > 0 ? end : start.clone().adjust(1, 0, 0, 0)
      for (const d = start.clone(); d.compare(last) < 0; d.adjust(1, 0, 0, 0)) {
        const key = `${d.year}-${String(d.month).padStart(2, '0')}-${String(d.day).padStart(2, '0')}`
        if (key >= dayKey(from) && key < dayKey(to)) busy.add(key)
      }
      return
    }
    const s = start.toJSDate().getTime()
    const e = Math.min(end ? end.toJSDate().getTime() : s + HOUR, s + 60 * 24 * HOUR)
    if (e <= from.getTime() || s >= to.getTime()) return
    // Hours per local day, in 15-minute steps
    const perDay = new Map<string, number>()
    for (let t = s; t < e; t += HOUR / 4) {
      const k = dayKey(new Date(t))
      perDay.set(k, (perDay.get(k) ?? 0) + Math.min(HOUR / 4, e - t) / HOUR)
    }
    for (const [k, h] of perDay) if (h >= hours && k >= dayKey(from) && k < dayKey(to)) busy.add(k)
  }

  for (const vevent of root.getAllSubcomponents('vevent')) {
    if (String(vevent.getFirstPropertyValue('status') ?? '').toUpperCase() === 'CANCELLED') continue
    if (String(vevent.getFirstPropertyValue('transp') ?? '').toUpperCase() === 'TRANSPARENT') continue
    const event = new ICAL.Event(vevent)
    // Changed single occurrences (RECURRENCE-ID) are handled through their master event
    if (event.isRecurrenceException()) continue
    if (!event.startDate) continue
    if (!event.isRecurring()) {
      mark(event.startDate, event.endDate)
      continue
    }
    const it = event.iterator()
    for (let i = 0, next = it.next(); next && i < 2000; i++, next = it.next()) {
      if (next.toJSDate().getTime() >= to.getTime()) break
      const o = event.getOccurrenceDetails(next)
      if (String(o.item.component.getFirstPropertyValue('status') ?? '').toUpperCase() === 'CANCELLED') continue
      mark(o.startDate, o.endDate)
    }
  }
  return busy
}

let feedCache: { at: number; text: string } | null = null

async function feedText(): Promise<string | null> {
  const raw = process.env.AVAILABILITY_ICS_URL
  if (!raw) return null
  if (feedCache && Date.now() - feedCache.at < TTL) return feedCache.text
  try {
    const url = new URL(raw.replace(/^webcal:/i, 'https:'))
    const res = await fetch(url, { headers: feedHeaders(url), signal: AbortSignal.timeout(FEED_TIMEOUT), cache: 'no-store' })
    if (!res.ok) throw new Error(`HTTP ${res.status}`)
    const text = await res.text()
    if (!text.includes('BEGIN:VCALENDAR')) throw new Error('not an iCal feed')
    feedCache = { at: Date.now(), text }
    return text
  } catch (err) {
    console.error('[availability] calendar feed failed:', (err as Error).message)
    // Keep serving the last good copy for a while rather than showing everything free
    return feedCache && Date.now() - feedCache.at < 24 * 60 * HOUR ? feedCache.text : null
  }
}

async function busyFromProjects(from: Date, to: Date): Promise<Set<string>> {
  const payload = await getPayloadClient()
  const res = await payload.find({
    collection: 'projects',
    where: {
      and: [
        { shootDate: { greater_than_equal: new Date(from.getTime() - 24 * HOUR).toISOString() } },
        { shootDate: { less_than: to.toISOString() } },
        { stage: { not_in: ['inquiry', 'archive'] } },
      ],
    },
    limit: 0,
    pagination: false,
    depth: 0,
    overrideAccess: true,
    select: { shootDate: true },
  })
  const busy = new Set<string>()
  for (const p of res.docs) {
    if (!p.shootDate) continue
    // A date without a time is stored as 00:00 UTC
    const key = p.shootDate.slice(11, 19) === '00:00:00' ? p.shootDate.slice(0, 10) : dayKey(new Date(p.shootDate))
    if (key >= dayKey(from) && key < dayKey(to)) busy.add(key)
  }
  return busy
}

export interface Availability {
  busy: string[]
  /** The calendar feed is configured and was read */
  feed: 'ok' | 'missing' | 'failed'
}

export async function getAvailability(from: Date, to: Date): Promise<Availability> {
  const [projects, text] = await Promise.all([busyFromProjects(from, to), feedText()])
  let feedBusy = new Set<string>()
  let feed: Availability['feed'] = feedConfigured() ? 'failed' : 'missing'
  if (text) {
    try {
      feedBusy = busyFromIcs(text, from, to)
      feed = 'ok'
    } catch (err) {
      console.error('[availability] calendar feed unreadable:', (err as Error).message)
    }
  }
  return { busy: [...new Set([...projects, ...feedBusy])].sort(), feed }
}

/** Is this YYYY-MM-DD busy? For the inquiry email to the photographer. */
export async function isBusy(day: string): Promise<boolean> {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(day)) return false
  const from = new Date(`${day}T00:00:00Z`)
  const { busy } = await getAvailability(new Date(from.getTime() - 12 * HOUR), new Date(from.getTime() + 36 * HOUR))
  return busy.includes(day)
}
