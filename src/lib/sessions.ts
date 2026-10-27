// Offerings and add-ons for /sessions, read from Payload.
import 'server-only'
import type { Offering } from '@/payload-types'
import { getPayloadClient } from '@/lib/payload'
import { getPublishedSeries, toView, type Locale } from '@/lib/portfolio'
import type { PhotoView } from '@/lib/photo-view'

export interface SessionOffering {
  id: number
  slug: string
  genre: string
  title: string
  tagline: string | null
  includes: string[]
  duration: string | null
  deliveryDays: number | null
  fromPrice: number | null
  depositPercent: number | null
  imageQuota: number | null
  extraImagePrice: number | null
  revisionRounds: number | null
  /** A few photos from the genre's published series */
  photos: PhotoView[]
}

export interface SessionsData {
  offerings: SessionOffering[]
  addOns: { label: string; price: string }[]
  priceNote: string | null
}

/** n items evenly spaced across the list (first, middle, last, …). */
function spread<T>(list: T[], n: number): T[] {
  if (list.length <= n) return list
  return Array.from({ length: n }, (_, i) => list[Math.round((i * (list.length - 1)) / (n - 1))])
}

const genreSlug = (o: Offering) => (typeof o.genre === 'object' && o.genre ? o.genre.slug : null)

/**
 * Offerings whose genre has at least one published series (decision D1),
 * each with up to three photos from that genre.
 */
export async function getSessions(locale: Locale): Promise<SessionsData> {
  try {
    const payload = await getPayloadClient()
    const [offerings, settings, series] = await Promise.all([
      payload.find({ collection: 'offerings', sort: 'order', locale, limit: 0, pagination: false, depth: 1 }),
      payload.findGlobal({ slug: 'sessions-settings', locale, depth: 0 }),
      getPublishedSeries(locale),
    ])

    const photosByGenre = new Map<string, PhotoView[]>()
    for (const s of series) {
      if (!s.genre) continue
      const list = photosByGenre.get(s.genre.slug) ?? []
      // Highly rated photos first, then picks spread across the series so the
      // strip doesn't show three near-identical consecutive frames
      const rated = s.photos.filter((p) => (p.rating ?? 0) >= 4).sort((a, b) => (b.rating ?? 0) - (a.rating ?? 0))
      const rest = s.photos.filter((p) => (p.rating ?? 0) < 4)
      list.push(...[...rated, ...spread(rest, 3)].map((p) => toView(p, s)))
      photosByGenre.set(s.genre.slug, list)
    }

    return {
      offerings: offerings.docs
        .filter((o) => {
          const g = genreSlug(o)
          return g !== null && photosByGenre.has(g)
        })
        .map((o) => {
          const g = genreSlug(o) as string
          return {
            id: o.id,
            slug: o.slug,
            genre: g,
            title: o.title,
            tagline: o.tagline ?? null,
            includes: (o.includes ?? '').split('\n').map((l) => l.trim()).filter(Boolean),
            duration: o.duration ?? null,
            deliveryDays: o.deliveryDays ?? null,
            fromPrice: o.fromPrice ?? null,
            depositPercent: o.depositPercent ?? null,
            imageQuota: o.imageQuota ?? null,
            extraImagePrice: o.extraImagePrice ?? null,
            revisionRounds: o.revisionRounds ?? null,
            photos: (photosByGenre.get(g) ?? []).slice(0, 3),
          }
        }),
      addOns: (settings.addOns ?? []).map((a) => ({ label: a.label, price: a.price })),
      priceNote: settings.priceNote ?? null,
    }
  } catch (err) {
    console.error('[sessions] failed to load:', err)
    return { offerings: [], addOns: [], priceNote: null }
  }
}

/** "120 €" / "€120" depending on the locale. */
export const formatPrice = (amount: number, locale: Locale) =>
  new Intl.NumberFormat(locale === 'de' ? 'de-DE' : 'en-IE', {
    style: 'currency',
    currency: 'EUR',
    maximumFractionDigits: amount % 1 ? 2 : 0,
  }).format(amount)
