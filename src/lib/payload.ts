// Server-side Payload client — uses getPayload() directly (no HTTP round-trip).
// Safe to import only from Server Components and API route handlers.
// Client components should call the REST API at /api/* instead.
import 'server-only'
import { getPayload } from 'payload'
import configPromise from '@payload-config'
import { cache } from 'react'

export const getPayloadClient = cache(async () => {
  return getPayload({ config: configPromise })
})

// --------------------------------------------------------------------------
// Types (kept identical to the old REST-client types for zero page changes)
// --------------------------------------------------------------------------

export interface PayloadAlbum {
  id: number
  slug: string
  title: string
  clientName?: string
  approvalStatus: 'pending' | 'notified' | 'submitted' | 'approved'
  selections?: Array<{ filename: string; comment?: string }>
  selectionMin?: number
  selectionMax?: number
  allowDownloads?: boolean
  approvalTerms?: string
  published?: boolean
}

export interface PayloadReview {
  id: number
  name: string
  role?: string
  quote: string
  avatar?: { url: string } | null
  communication: number
  creativity: number
  professionalism: number
  value: number
  album?: { slug: string; title: string } | null
}

// --------------------------------------------------------------------------
// Albums
// --------------------------------------------------------------------------

export async function fetchAlbumByToken(token: string): Promise<PayloadAlbum | null> {
  const payload = await getPayloadClient()
  const result = await payload.find({
    collection: 'albums',
    where: { approvalToken: { equals: token } },
    limit: 1,
    select: {
      slug: true,
      title: true,
      clientName: true,
      approvalStatus: true,
      selections: true,
      selectionMin: true,
      selectionMax: true,
      allowDownloads: true,
      approvalTerms: true,
    },
  })
  return (result.docs[0] as unknown as PayloadAlbum) ?? null
}

// --------------------------------------------------------------------------
// Approval
// --------------------------------------------------------------------------

export async function submitSelections(data: {
  token: string
  selections: Array<{ filename: string; comment?: string }>
  publicationConsent: boolean
}): Promise<{ ok: boolean; error?: string }> {
  const payload = await getPayloadClient()
  const result = await payload.find({
    collection: 'albums',
    where: { approvalToken: { equals: data.token } },
    limit: 1,
  })
  const album = result.docs[0]
  if (!album) return { ok: false, error: 'Invalid token' }
  if (album.approvalStatus === 'approved') return { ok: false, error: 'Album already approved' }

  const count = data.selections.length
  if (album.selectionMin && count < album.selectionMin)
    return { ok: false, error: `Please select at least ${album.selectionMin} images` }
  if (album.selectionMax && count > album.selectionMax)
    return { ok: false, error: `Please select at most ${album.selectionMax} images` }

  await payload.update({
    collection: 'albums',
    id: album.id,
    data: {
      selections: data.selections.map((s) => ({ filename: s.filename, comment: s.comment ?? '' })),
      approvalStatus: 'submitted',
    },
  })
  return { ok: true }
}

// --------------------------------------------------------------------------
// Reviews / Testimonials
// --------------------------------------------------------------------------

export async function fetchApprovedReviews(): Promise<PayloadReview[]> {
  const payload = await getPayloadClient()
  const result = await payload.find({
    collection: 'reviews',
    where: { approved: { equals: true } },
    depth: 1,
    limit: 50,
  })
  return result.docs as unknown as PayloadReview[]
}

export async function submitReview(data: {
  albumSlug?: string
  name: string
  role?: string
  quote: string
  avatarBase64?: string
  communication: number
  creativity: number
  professionalism: number
  value: number
}): Promise<{ ok: boolean; error?: string }> {
  const payload = await getPayloadClient()

  // Resolve album ID from slug
  let albumId: number | undefined
  if (data.albumSlug) {
    const albumResult = await payload.find({
      collection: 'albums',
      where: { slug: { equals: data.albumSlug } },
      limit: 1,
    })
    albumId = albumResult.docs[0]?.id as number | undefined
  }

  try {
    await payload.create({
      collection: 'reviews',
      data: {
        name: data.name,
        role: data.role,
        quote: data.quote,
        communication: data.communication,
        creativity: data.creativity,
        professionalism: data.professionalism,
        value: data.value,
        approved: false,
        ...(albumId && { album: albumId }),
      },
    })
    return { ok: true }
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : 'Submission failed' }
  }
}
