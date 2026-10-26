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

// Processed photos are regenerable, so any writable location works. Candidates
// in order of preference; the first one the server can write to is used.
const rootCandidates = () =>
  [
    process.env.PHOTO_DIR,
    path.join(process.env.MEDIA_DIR ?? '/app/public/media', 'photos'),
    process.env.IMAGE_CACHE_DIR && path.join(process.env.IMAGE_CACHE_DIR, 'photos'),
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

let resolvedRoot: string | null = null
export function photoRoot() {
  if (!resolvedRoot) {
    const candidates = rootCandidates()
    resolvedRoot = candidates.find(writable) ?? candidates[0]
    console.log(`[sync] processed photos stored in ${resolvedRoot}`)
  }
  return resolvedRoot
}

/** True when the processed files of this photo version exist on disk. */
export const hasProcessedFiles = (fileId: number, version: string) => existsSync(photoDir(fileId, version))

export const photoDir = (fileId: number, version?: string) =>
  version ? path.join(photoRoot(), String(fileId), version) : path.join(photoRoot(), String(fileId))

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
export function targetWidths(originalWidth: number): number[] {
  const max = Math.min(originalWidth, PHOTO_WIDTHS[PHOTO_WIDTHS.length - 1])
  // Skip standard widths that are barely smaller than the top size
  return [...PHOTO_WIDTHS.filter((w) => w < max * 0.85), max]
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

/** Processes `buffer` and writes the derivatives to photoDir(fileId, version). */
export async function processPhoto(buffer: Buffer, fileId: number, version: string): Promise<ProcessedPhoto> {
  // rotate() applies the EXIF orientation, so width/height are as displayed
  const oriented = await sharp(buffer, { failOn: 'error' }).rotate().toBuffer({ resolveWithObject: true })
  const { width, height } = oriented.info
  const base = () => sharp(oriented.data)

  const finalDir = photoDir(fileId, version)
  const tmpDir = `${finalDir}.tmp-${process.pid}-${Date.now()}`
  await mkdir(tmpDir, { recursive: true })
  try {
    const widths = targetWidths(width)
    for (const w of widths) {
      const resized = base().resize({ width: w, withoutEnlargement: true })
      await writeFile(path.join(tmpDir, `${w}.webp`), await resized.clone().webp({ quality: 82 }).toBuffer())
      await writeFile(path.join(tmpDir, `${w}.avif`), await resized.clone().avif({ quality: 55, effort: 0 }).toBuffer())
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

/** Removes derivative folders of older versions of a photo. */
export async function removeOtherVersions(fileId: number, keepVersion: string) {
  const dir = photoDir(fileId)
  for (const entry of await readdir(dir).catch(() => [] as string[])) {
    if (entry !== keepVersion) await rm(path.join(dir, entry), { recursive: true, force: true })
  }
}
