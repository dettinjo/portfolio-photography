// Serves processed photos from disk: /api/photos/<ncFileId>/<version>/<width>
// The version changes whenever a photo is re-exported, so responses are immutable.
// AVIF is served to browsers that accept it, WebP otherwise.
import { type NextRequest } from 'next/server'
import { readdir, readFile } from 'fs/promises'
import { findPhotoDir } from '@/lib/sync/process'

type Params = { params: Promise<{ id: string; version: string; width: string }> }

export async function GET(req: NextRequest, { params }: Params) {
  const { id, version, width } = await params
  if (!/^\d{1,12}$/.test(id) || !/^[a-z0-9]{1,40}$/.test(version) || !/^\d{1,5}$/.test(width)) {
    return new Response('Not found', { status: 404 })
  }

  const dir = findPhotoDir(Number(id), version)
  if (!dir) return new Response('Not found', { status: 404 })
  const available = (await readdir(dir).catch(() => [] as string[]))
    .filter((f) => f.endsWith('.webp'))
    .map((f) => Number(f.slice(0, -5)))
    .sort((a, b) => a - b)
  if (!available.length) return new Response('Not found', { status: 404 })

  // Smallest stored width that covers the request, else the largest one
  const requested = Number(width)
  const w = available.find((a) => a >= requested) ?? available[available.length - 1]
  const avif = (req.headers.get('accept') ?? '').includes('image/avif')

  let body: Buffer
  let type = 'image/webp'
  try {
    body = avif ? await readFile(`${dir}/${w}.avif`) : await readFile(`${dir}/${w}.webp`)
    if (avif) type = 'image/avif'
  } catch {
    body = await readFile(`${dir}/${w}.webp`)
  }

  return new Response(new Uint8Array(body), {
    headers: {
      'Content-Type': type,
      'Cache-Control': 'public, max-age=31536000, immutable',
      Vary: 'Accept',
    },
  })
}
