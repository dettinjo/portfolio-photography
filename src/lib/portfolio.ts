// Public portfolio data, read from Payload (filled by the Nextcloud sync).
import 'server-only'
import type { Where } from 'payload'
import type { Genre, Photo, Series } from '@/payload-types'
import { getPayloadClient } from '@/lib/payload'
import { cameraLabel, type PhotoView } from '@/lib/photo-view'

export type Locale = 'en' | 'de'
export const toLocale = (value: string): Locale => (value === 'de' ? 'de' : 'en')

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
  rating: number | null
  takenAt: string | null
  camera: string | null
  lens: string | null
  focalLength: number | null
  aperture: number | null
  exposureTime: number | null
  iso: number | null
  /** URL for a given display width; the server picks the closest stored size */
  url: (width: number) => string
}

export interface PortfolioGenre {
  id: number
  slug: string
  name: string
}

export interface PortfolioSeries {
  id: number
  slug: string
  title: string
  story: string | null
  draft: boolean
  genre: PortfolioGenre | null
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
    rating: p.meta?.rating ?? null,
    takenAt: p.takenAt ?? null,
    camera: cameraLabel(p.meta?.camera ?? null),
    lens: p.meta?.lens ?? null,
    focalLength: p.meta?.focalLength ?? null,
    aperture: p.meta?.aperture ?? null,
    exposureTime: p.meta?.exposureTime ?? null,
    iso: p.meta?.iso ?? null,
    url: (w) => photoUrl(p, w),
  }
}

/** Plain, serialisable form of a photo for client components. */
export function toView(p: PortfolioPhoto, series?: Pick<PortfolioSeries, 'slug' | 'title' | 'genre'>): PhotoView {
  return {
    id: p.id,
    width: p.width,
    height: p.height,
    placeholder: p.placeholder,
    color: p.color,
    alt: p.alt,
    title: p.title,
    caption: p.caption,
    takenAt: p.takenAt,
    camera: p.camera,
    lens: p.lens,
    focalLength: p.focalLength,
    aperture: p.aperture,
    exposureTime: p.exposureTime,
    iso: p.iso,
    src: p.url(960),
    srcSet: [480, 960, 1600].map((w) => `${p.url(w)} ${w}w`).join(', '),
    large: p.url(2400),
    seriesSlug: series?.slug ?? null,
    seriesTitle: series?.title ?? null,
    genre: series?.genre?.slug ?? null,
  }
}

const relId = (value: unknown) =>
  typeof value === 'object' && value !== null ? (value as { id: number }).id : (value as number | null)

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
    depth: 1,
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
    const own = photos.docs.filter((p) => relId(p.series) === s.id)
    const list = own.map((p) => toPhoto(p, s.title))
    const coverId = relId(s.cover)
    const cover =
      list.find((p) => p.id === coverId) ?? list.find((p) => (p.rating ?? 0) >= 5) ?? list[0] ?? null
    const genre = s.genre && typeof s.genre === 'object' ? (s.genre as Genre) : null
    return {
      id: s.id,
      slug: s.slug,
      title: s.title,
      story: s.story ?? null,
      draft: Boolean(s.draft),
      genre: genre ? { id: genre.id, slug: genre.slug, name: genre.name } : null,
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

/** Genres that have at least one published series, in display order. */
export function genresOf(series: PortfolioSeries[]): PortfolioGenre[] {
  const seen = new Map<number, PortfolioGenre>()
  for (const s of series) if (s.genre && !seen.has(s.genre.id)) seen.set(s.genre.id, s.genre)
  return [...seen.values()]
}

export interface PhotoPage {
  photo: PortfolioPhoto
  series: PortfolioSeries
  index: number
  previous: PortfolioPhoto | null
  next: PortfolioPhoto | null
}

/** A public photo with its series and neighbours, or null if it is not public. */
export async function getPhotoPage(id: number, locale: Locale): Promise<PhotoPage | null> {
  const payload = await getPayloadClient()
  const doc = await payload
    .findByID({ collection: 'photos', id, depth: 0, overrideAccess: false })
    .catch(() => null)
  const seriesId = doc ? relId(doc.series) : null
  if (!doc || !seriesId) return null

  const [series] = await loadSeries({ id: { equals: seriesId } }, locale)
  if (!series) return null
  const index = series.photos.findIndex((p) => p.id === id)
  if (index === -1) return null
  return {
    photo: series.photos[index],
    series,
    index,
    previous: series.photos[index - 1] ?? null,
    next: series.photos[index + 1] ?? null,
  }
}
