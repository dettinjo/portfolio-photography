// Turns one exported image into the files the site serves: AVIF + WebP at a
// few widths, a tiny blurred placeholder and the dominant colour. Output never
// carries EXIF/GPS — only the selected metadata below is kept, in the database.
// AVIF uses effort 0: same file size as higher efforts here, ~30x faster.
import 'server-only'
import { existsSync, mkdirSync, rmSync, writeFileSync } from 'fs'
import { mkdir, readdir, rename, rm, writeFile } from 'fs/promises'
import path from 'path'
import sharp from 'sharp'
import exifr from 'exifr'

export const PHOTO_WIDTHS = [480, 960, 1600, 2400]
/** Client previews: smaller, WebP only, watermarked (decision D4). */
export const PREVIEW_WIDTHS = [480, 960, 1600, 2048]
/** Delivered finals: gallery sizes; the original and a web-size JPEG are kept beside them. */
export const FINAL_WIDTHS = [480, 960, 1600]
export const WEB_SIZE = 2048

/**
 * Portfolio photos and client previews are kept apart: portfolio files are
 * served publicly by /api/photos, previews only by /api/previews after an
 * access check — they must never be reachable through the public route.
 */
export type ImageKind = 'photos' | 'previews' | 'finals'

// Processed images are regenerable, so any writable location works. Candidates
// in order of preference; the first one the server can write to is used.
const rootCandidates = (kind: ImageKind = 'photos') =>
  [
    kind === 'photos' ? process.env.PHOTO_DIR : kind === 'previews' ? process.env.PREVIEW_DIR : process.env.FINALS_DIR,
    path.join(process.env.MEDIA_DIR ?? '/app/public/media', kind),
    process.env.IMAGE_CACHE_DIR && path.join(process.env.IMAGE_CACHE_DIR, kind),
  ].filter((p): p is string => Boolean(p))

function writable(dir: string) {
  try {
    mkdirSync(dir, { recursive: true })
    const probe = path.join(dir, `.write-test-${process.pid}`)
    writeFileSync(probe, '')
    rmSync(probe)
    return true
  } catch {
    return false
  }
}

const resolvedRoots: Partial<Record<ImageKind, string>> = {}
export function photoRoot(kind: ImageKind = 'photos') {
  if (!resolvedRoots[kind]) {
    const candidates = rootCandidates(kind)
    resolvedRoots[kind] = candidates.find(writable) ?? candidates[0]
    console.log(`[sync] processed ${kind} stored in ${resolvedRoots[kind]}`)
  }
  return resolvedRoots[kind] as string
}

/** True when the processed files of this version exist in the current root. */
export const hasProcessedFiles = (fileId: number, version: string, kind: ImageKind = 'photos') =>
  existsSync(photoDir(fileId, version, kind))

/**
 * Where to read a photo version from: the current root first, then the other
 * candidates — so photos keep being served while they are regenerated after
 * the preferred location changes (e.g. the storage box became writable).
 */
export function findPhotoDir(fileId: number, version: string, kind: ImageKind = 'photos'): string | null {
  const roots = [photoRoot(kind), ...rootCandidates(kind).filter((r) => r !== photoRoot(kind))]
  for (const root of roots) {
    const dir = path.join(root, String(fileId), version)
    if (existsSync(dir)) return dir
  }
  return null
}

/** Removes copies of a photo left in non-current roots. */
async function removeFromOtherRoots(fileId: number, kind: ImageKind) {
  for (const root of rootCandidates(kind).filter((r) => r !== photoRoot(kind))) {
    await rm(path.join(root, String(fileId)), { recursive: true, force: true }).catch(() => {})
  }
}

export const photoDir = (fileId: number, version?: string, kind: ImageKind = 'photos') =>
  version ? path.join(photoRoot(kind), String(fileId), version) : path.join(photoRoot(kind), String(fileId))

export interface ProcessedPhoto {
  width: number
  height: number
  widths: number[]
  placeholder: string
  color: string
  takenAt: string | null
  meta: {
    title: string | null
    caption: string | null
    keywords: string[]
    rating: number | null
    camera: string | null
    lens: string | null
    focalLength: number | null
    aperture: number | null
    exposureTime: number | null
    iso: number | null
  }
}

/** Widths to generate: the standard set below the original, plus the original size (capped). */
export function targetWidths(originalWidth: number, standard = PHOTO_WIDTHS): number[] {
  const max = Math.min(originalWidth, standard[standard.length - 1])
  // Skip standard widths that are barely smaller than the top size
  return [...standard.filter((w) => w < max * 0.85), max]
}

const WATERMARK_FONT =
  process.env.WATERMARK_FONT ?? path.join(process.cwd(), 'assets', 'fonts', 'JetBrainsMono.ttf')

const escapeMarkup = (value: string) =>
  value.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')

/**
 * Burns a small text label into the bottom-right corner: white at 75 % with a
 * soft dark shadow, so it reads on bright and dark photos alike.
 */
async function watermark(image: Buffer, width: number, height: number, label: string): Promise<Buffer> {
  const px = Math.max(11, Math.round(Math.min(width, height) * 0.017))
  const render = (color: string, alpha: string) =>
    sharp({
      text: {
        text: `<span foreground="${color}" fgalpha="${alpha}">${escapeMarkup(label)}</span>`,
        font: 'JetBrains Mono 10',
        fontfile: WATERMARK_FONT,
        rgba: true,
        dpi: Math.round((px * 72) / 10),
      },
    })
      .png()
      .toBuffer({ resolveWithObject: true })
  const [text, shadow] = await Promise.all([render('#ffffff', '75%'), render('#000000', '35%')])
  const margin = Math.round(px * 1.6)
  const left = Math.max(0, width - text.info.width - margin)
  const top = Math.max(0, height - text.info.height - margin)
  const blurred = await sharp(shadow.data).blur(Math.max(1, px / 8)).toBuffer()
  return sharp(image)
    .composite([
      { input: blurred, left: Math.min(left + 1, width - shadow.info.width), top: Math.min(top + 1, height - shadow.info.height) },
      { input: text.data, left, top },
    ])
    .toBuffer()
}

// XMP language alternatives come back as { value, lang } or arrays of them
function text(value: unknown): string | null {
  if (value == null) return null
  if (typeof value === 'string') return value.trim() || null
  if (Array.isArray(value)) return text(value[0])
  if (typeof value === 'object' && 'value' in (value as object)) return text((value as { value: unknown }).value)
  return String(value).trim() || null
}

function list(value: unknown): string[] {
  if (value == null) return []
  const items = Array.isArray(value) ? value : String(value).split(/[;,]/)
  return items.map((v) => text(v)).filter((v): v is string => Boolean(v))
}

function num(value: unknown): number | null {
  const n = Number(value)
  return Number.isFinite(n) ? n : null
}

async function readMetadata(buffer: Buffer): Promise<Pick<ProcessedPhoto, 'meta' | 'takenAt'>> {
  let tags: Record<string, unknown> = {}
  try {
    tags = (await exifr.parse(buffer, { xmp: true, iptc: true, tiff: true, exif: true, gps: false, icc: false })) ?? {}
  } catch {
    // unreadable metadata is not fatal
  }
  const make = text(tags.Make)
  const model = text(tags.Model)
  const taken = tags.DateTimeOriginal ?? tags.CreateDate
  return {
    takenAt: taken instanceof Date && !isNaN(taken.getTime()) ? taken.toISOString() : null,
    meta: {
      title: text(tags.title) ?? text(tags.ObjectName),
      caption: text(tags.description) ?? text(tags.Caption) ?? text(tags.ImageDescription),
      keywords: list(tags.subject ?? tags.Keywords),
      rating: num(tags.Rating),
      camera: model ? (make && !model.startsWith(make) ? `${make} ${model}` : model) : make,
      lens: text(tags.LensModel),
      focalLength: num(tags.FocalLength),
      aperture: num(tags.FNumber),
      exposureTime: num(tags.ExposureTime),
      iso: num(tags.ISO),
    },
  }
}

export interface ProcessOptions {
  kind?: ImageKind
  /** Text burned into every derivative (previews only) */
  watermark?: string | null
  /** Finals: file name of the original, kept byte for byte as original.<ext> */
  originalName?: string
}

export const originalFileName = (name: string) => `original${(path.extname(name) || '.jpg').toLowerCase()}`

/** Processes `buffer` and writes the derivatives to photoDir(fileId, version, kind). */
export async function processPhoto(
  buffer: Buffer,
  fileId: number,
  version: string,
  { kind = 'photos', watermark: label, originalName }: ProcessOptions = {},
): Promise<ProcessedPhoto> {
  // rotate() applies the EXIF orientation, so width/height are as displayed
  let oriented = await sharp(buffer, { failOn: 'error' }).rotate().toBuffer({ resolveWithObject: true })
  if (kind === 'previews') {
    // Previews never exist larger than 2048 px, and never without the watermark
    const max = PREVIEW_WIDTHS[PREVIEW_WIDTHS.length - 1]
    oriented = await sharp(oriented.data)
      .resize({ width: max, height: max, fit: 'inside', withoutEnlargement: true })
      .toBuffer({ resolveWithObject: true })
    if (label) {
      const marked = await watermark(oriented.data, oriented.info.width, oriented.info.height, label)
      oriented = await sharp(marked).toBuffer({ resolveWithObject: true })
    }
  }
  const { width, height } = oriented.info
  const base = () => sharp(oriented.data)

  const finalDir = photoDir(fileId, version, kind)
  const tmpDir = `${finalDir}.tmp-${process.pid}-${Date.now()}`
  await mkdir(tmpDir, { recursive: true })
  try {
    const widths = targetWidths(width, kind === 'previews' ? PREVIEW_WIDTHS : kind === 'finals' ? FINAL_WIDTHS : PHOTO_WIDTHS)
    for (const w of widths) {
      const resized = base().resize({ width: w, withoutEnlargement: true })
      await writeFile(path.join(tmpDir, `${w}.webp`), await resized.clone().webp({ quality: 82 }).toBuffer())
      if (kind === 'photos') {
        await writeFile(path.join(tmpDir, `${w}.avif`), await resized.clone().avif({ quality: 55, effort: 0 }).toBuffer())
      }
    }
    if (kind === 'finals') {
      // The delivery itself: the exported file untouched, plus a web-size copy for sharing
      await writeFile(path.join(tmpDir, originalFileName(originalName ?? 'original.jpg')), buffer)
      await writeFile(
        path.join(tmpDir, 'web.jpg'),
        await base()
          .resize({ width: WEB_SIZE, height: WEB_SIZE, fit: 'inside', withoutEnlargement: true })
          .jpeg({ quality: 88, mozjpeg: true })
          .toBuffer(),
      )
    }
    await rm(finalDir, { recursive: true, force: true })
    await rename(tmpDir, finalDir)

    const placeholderBuf = await base().resize(16, 16, { fit: 'inside' }).webp({ quality: 40 }).toBuffer()
    const { dominant } = await base().stats()
    const color = `#${[dominant.r, dominant.g, dominant.b].map((c) => c.toString(16).padStart(2, '0')).join('')}`

    return {
      width,
      height,
      widths,
      placeholder: `data:image/webp;base64,${placeholderBuf.toString('base64')}`,
      color,
      ...(await readMetadata(buffer)),
    }
  } catch (err) {
    await rm(tmpDir, { recursive: true, force: true })
    throw err
  }
}

/** Removes older versions of a photo, and copies left in other locations. */
export async function removeOtherVersions(fileId: number, keepVersion: string, kind: ImageKind = 'photos') {
  const dir = photoDir(fileId, undefined, kind)
  for (const entry of await readdir(dir).catch(() => [] as string[])) {
    if (entry !== keepVersion) await rm(path.join(dir, entry), { recursive: true, force: true })
  }
  await removeFromOtherRoots(fileId, kind)
}

/** Deletes every processed file of a photo (e.g. a preview that left its folder). */
export async function removeAllVersions(fileId: number, kind: ImageKind) {
  for (const root of rootCandidates(kind)) {
    await rm(path.join(root, String(fileId)), { recursive: true, force: true }).catch(() => {})
  }
}
