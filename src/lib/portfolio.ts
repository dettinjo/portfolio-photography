// Public portfolio data, read from Payload (filled by the Nextcloud sync).
import 'server-only'
import type { Where } from 'payload'
import type { Photo, Series } from '@/payload-types'
import { getPayloadClient } from '@/lib/payload'

type Locale = 'en' | 'de'

export interface PortfolioPhoto {
  id: number
  filename: string
  width: number
  height: number
  placeholder: string | null
  color: string | null
  alt: string
  title: string | null
  caption: string | null
  /** URL for a given display width; the server picks the closest stored size */
  url: (width: number) => string
}

export interface PortfolioSeries {
  id: number
  slug: string
  title: string
  story: string | null
  draft: boolean
  cover: PortfolioPhoto | null
  photos: PortfolioPhoto[]
}

export const photoUrl = (p: Pick<Photo, 'ncFileId' | 'version'>, width: number) =>
  `/api/photos/${p.ncFileId}/${p.version}/${width}`

function toPhoto(p: Photo, seriesTitle: string): PortfolioPhoto {
  const title = p.title ?? p.meta?.title ?? null
  return {
    id: p.id,
    filename: p.filename,
    width: p.width ?? 1600,
    height: p.height ?? 2000,
    placeholder: p.placeholder ?? null,
    color: p.color ?? null,
    alt: p.alt ?? title ?? `Photograph from ${seriesTitle}`,
    title,
    caption: p.caption ?? p.meta?.caption ?? null,
    url: (w) => photoUrl(p, w),
  }
}

async function loadSeries(
  where: Where,
  locale: Locale,
  { includeDrafts = false } = {},
): Promise<PortfolioSeries[]> {
  const payload = await getPayloadClient()
  const conditions: Where[] = [where, { missing: { not_equals: true } }]
  if (!includeDrafts) conditions.push({ draft: { not_equals: true } })

  const series = await payload.find({
    collection: 'series',
    where: { and: conditions },
    sort: ['order', 'title'],
    locale,
    limit: 0,
    pagination: false,
    depth: 0,
  })
  if (!series.docs.length) return []

  const photos = await payload.find({
    collection: 'photos',
    where: {
      and: [
        { series: { in: series.docs.map((s) => s.id) } },
        { status: { equals: 'ready' } },
        { visibility: { equals: 'public' } },
      ],
    },
    sort: ['order', 'takenAt', 'filename'],
    locale,
    limit: 0,
    pagination: false,
    depth: 0,
  })

  return series.docs.map((s: Series) => {
    const own = photos.docs.filter((p) => (typeof p.series === 'object' ? p.series?.id : p.series) === s.id)
    const list = own.map((p) => toPhoto(p, s.title))
    const coverId = typeof s.cover === 'object' ? s.cover?.id : s.cover
    const cover =
      list.find((p) => p.id === coverId) ??
      list[own.findIndex((p) => (p.meta?.rating ?? 0) >= 5)] ??
      list[0] ??
      null
    return {
      id: s.id,
      slug: s.slug,
      title: s.title,
      story: s.story ?? null,
      draft: Boolean(s.draft),
      cover,
      photos: list,
    }
  })
}

/** Published series with at least one photo, in display order. */
export async function getPublishedSeries(locale: Locale): Promise<PortfolioSeries[]> {
  try {
    return (await loadSeries({}, locale)).filter((s) => s.photos.length > 0)
  } catch (err) {
    console.error('[portfolio] failed to load series:', err)
    return []
  }
}

/** One series by slug. Drafts are only returned when asked for (client approval). */
export async function getSeriesBySlug(
  slug: string,
  locale: Locale,
  options: { includeDrafts?: boolean } = {},
): Promise<PortfolioSeries | null> {
  const [series] = await loadSeries({ slug: { equals: slug } }, locale, options)
  return series ?? null
}
