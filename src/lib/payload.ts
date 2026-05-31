// Client for the Payload CMS REST API.
// All functions are safe to call from both server components and client components.

const CMS_URL = process.env.NEXT_PUBLIC_CMS_URL ?? 'https://cms.joeldettinger.de'

// --------------------------------------------------------------------------
// Types
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

/** Fetch an album by its approval token (public, no auth). */
export async function fetchAlbumByToken(token: string): Promise<PayloadAlbum | null> {
  const res = await fetch(`${CMS_URL}/api/albums/by-token/${token}`, {
    cache: 'no-store',
  })
  if (!res.ok) return null
  return res.json()
}

// --------------------------------------------------------------------------
// Approval
// --------------------------------------------------------------------------

export interface SubmitSelectionsPayload {
  token: string
  selections: Array<{ filename: string; comment?: string }>
  publicationConsent: boolean
}

export async function submitSelections(data: SubmitSelectionsPayload): Promise<{ ok: boolean; error?: string }> {
  const res = await fetch(`${CMS_URL}/api/approve`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  })
  const json = await res.json().catch(() => ({}))
  if (!res.ok) return { ok: false, error: json.error ?? 'Submission failed' }
  return { ok: true }
}

// --------------------------------------------------------------------------
// Reviews / Testimonials
// --------------------------------------------------------------------------

export interface SubmitReviewPayload {
  albumSlug?: string
  name: string
  role?: string
  quote: string
  avatarBase64?: string // base64 data URL
  communication: number
  creativity: number
  professionalism: number
  value: number
}

export async function fetchApprovedReviews(): Promise<PayloadReview[]> {
  const res = await fetch(
    `${CMS_URL}/api/reviews?where[approved][equals]=true&depth=1&limit=50`,
    { next: { revalidate: 300 } },
  )
  if (!res.ok) return []
  const data = await res.json()
  return data.docs ?? []
}

export async function submitReview(data: SubmitReviewPayload): Promise<{ ok: boolean; error?: string }> {
  // If there's a base64 avatar, upload it first as a media item
  let avatarId: number | undefined

  if (data.avatarBase64) {
    try {
      const blob = await (await fetch(data.avatarBase64)).blob()
      const form = new FormData()
      form.append('file', blob, 'avatar.jpg')
      form.append('alt', data.name)
      const mediaRes = await fetch(`${CMS_URL}/api/media`, {
        method: 'POST',
        body: form,
      })
      if (mediaRes.ok) {
        const mediaJson = await mediaRes.json()
        avatarId = mediaJson.doc?.id
      }
    } catch {
      // Avatar upload failure is non-fatal
    }
  }

  // Find album ID from slug if provided
  let albumId: number | undefined
  if (data.albumSlug) {
    const albumRes = await fetch(
      `${CMS_URL}/api/albums?where[slug][equals]=${encodeURIComponent(data.albumSlug)}&limit=1`,
    )
    if (albumRes.ok) {
      const albumData = await albumRes.json()
      albumId = albumData.docs?.[0]?.id
    }
  }

  const body: Record<string, unknown> = {
    name: data.name,
    role: data.role,
    quote: data.quote,
    communication: data.communication,
    creativity: data.creativity,
    professionalism: data.professionalism,
    value: data.value,
    approved: false, // always requires admin approval
  }
  if (avatarId) body.avatar = avatarId
  if (albumId) body.album = albumId

  const res = await fetch(`${CMS_URL}/api/reviews`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })
  const json = await res.json().catch(() => ({}))
  if (!res.ok) return { ok: false, error: json.errors?.[0]?.message ?? 'Submission failed' }
  return { ok: true }
}
