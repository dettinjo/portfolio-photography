// HTTP client for the Payload CMS REST API.
// The photography frontend communicates with the CMS over HTTP — it does NOT
// import Payload packages directly (that would require a DB at build time).

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

/** Fetch an album by its approval token (public, no auth). */
export async function fetchAlbumByToken(token: string): Promise<PayloadAlbum | null> {
  try {
    const res = await fetch(`${CMS_URL}/api/albums/by-token/${token}`, {
      cache: 'no-store',
      signal: AbortSignal.timeout(8000),
    })
    if (!res.ok) return null
    return res.json()
  } catch {
    return null
  }
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
  try {
    const res = await fetch(`${CMS_URL}/api/approve`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
      signal: AbortSignal.timeout(10000),
    })
    const json = await res.json().catch(() => ({}))
    if (!res.ok) return { ok: false, error: (json as { error?: string }).error ?? 'Submission failed' }
    return { ok: true }
  } catch {
    return { ok: false, error: 'Could not reach CMS. Please try again.' }
  }
}

// --------------------------------------------------------------------------
// Reviews / Testimonials
// --------------------------------------------------------------------------

export interface SubmitReviewPayload {
  albumSlug?: string
  name: string
  role?: string
  quote: string
  avatarBase64?: string
  communication: number
  creativity: number
  professionalism: number
  value: number
}

/** Fetch approved reviews for the testimonials section.
 *  Returns [] if the CMS is unreachable — page still renders without reviews. */
export async function fetchApprovedReviews(): Promise<PayloadReview[]> {
  try {
    const res = await fetch(
      `${CMS_URL}/api/reviews?where[approved][equals]=true&depth=1&limit=50`,
      { next: { revalidate: 300 }, signal: AbortSignal.timeout(5000) },
    )
    if (!res.ok) return []
    const data = await res.json()
    return (data as { docs?: PayloadReview[] }).docs ?? []
  } catch {
    return []
  }
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
        signal: AbortSignal.timeout(15000),
      })
      if (mediaRes.ok) {
        const mediaJson = await mediaRes.json() as { doc?: { id: number } }
        avatarId = mediaJson.doc?.id
      }
    } catch {
      // Avatar upload failure is non-fatal
    }
  }

  // Find album ID from slug if provided
  let albumId: number | undefined
  if (data.albumSlug) {
    try {
      const albumRes = await fetch(
        `${CMS_URL}/api/albums?where[slug][equals]=${encodeURIComponent(data.albumSlug)}&limit=1`,
        { signal: AbortSignal.timeout(5000) },
      )
      if (albumRes.ok) {
        const albumData = await albumRes.json() as { docs?: { id: number }[] }
        albumId = albumData.docs?.[0]?.id
      }
    } catch {
      // Album lookup failure is non-fatal
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
    approved: false,
  }
  if (avatarId) body.avatar = avatarId
  if (albumId) body.album = albumId

  try {
    const res = await fetch(`${CMS_URL}/api/reviews`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
      signal: AbortSignal.timeout(10000),
    })
    const json = await res.json().catch(() => ({})) as { errors?: Array<{ message: string }> }
    if (!res.ok) return { ok: false, error: json.errors?.[0]?.message ?? 'Submission failed' }
    return { ok: true }
  } catch {
    return { ok: false, error: 'Could not reach CMS. Please try again.' }
  }
}
