// Server-side data access for the embedded Payload CMS.
// Uses the Payload Local API directly — Payload runs inside this Next.js app,
// so there is no HTTP hop and no separate CMS host. Only call this from
// dynamic routes (it needs the database at request time, not at build time).
import 'server-only'
import { getPayload } from 'payload'
import config from '@payload-config'

export const getPayloadClient = () => getPayload({ config })

// --------------------------------------------------------------------------
// Types
// --------------------------------------------------------------------------

export interface ApprovalAlbum {
  id: number
  slug: string
  title: string
  clientName?: string | null
  approvalStatus?: 'pending' | 'notified' | 'submitted' | 'approved' | null
  selections?: Array<{ filename: string; comment?: string | null }> | null
  selectionMin?: number | null
  selectionMax?: number | null
  allowDownloads?: boolean | null
  approvalTerms?: string | null
}

export interface PublicReview {
  id: number
  name: string
  role?: string | null
  quote: string
  avatarUrl: string | null
  communication: number
  creativity: number
  professionalism: number
  value: number
}

// --------------------------------------------------------------------------
// Albums / approval
// --------------------------------------------------------------------------

const TOKEN_RE = /^[0-9a-f-]{36}$/i

/** Look up an album by its approval token. Returns only the fields the approval UI needs. */
export async function fetchAlbumByToken(token: string): Promise<ApprovalAlbum | null> {
  if (!TOKEN_RE.test(token)) return null
  const payload = await getPayloadClient()
  const result = await payload.find({
    collection: 'albums',
    where: { approvalToken: { equals: token } },
    limit: 1,
    depth: 0,
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
  return (result.docs[0] as ApprovalAlbum | undefined) ?? null
}

export interface SubmitSelectionsPayload {
  token: string
  selections: Array<{ filename: string; comment?: string }>
  publicationConsent?: boolean
}

export async function submitSelections(
  data: SubmitSelectionsPayload,
): Promise<{ ok: boolean; status?: number; error?: string }> {
  const { token, selections, publicationConsent } = data ?? ({} as SubmitSelectionsPayload)

  if (typeof token !== 'string' || !TOKEN_RE.test(token) || !Array.isArray(selections)) {
    return { ok: false, status: 400, error: 'Missing token or selections' }
  }
  if (selections.length > 2000) return { ok: false, status: 400, error: 'Too many selections' }

  const clean: Array<{ filename: string; comment: string }> = []
  const seen = new Set<string>()
  for (const s of selections) {
    if (!s || typeof s.filename !== 'string' || !s.filename || s.filename.length > 255) {
      return { ok: false, status: 400, error: 'Invalid selection' }
    }
    if (seen.has(s.filename)) continue
    seen.add(s.filename)
    const comment = typeof s.comment === 'string' ? s.comment.slice(0, 2000) : ''
    clean.push({ filename: s.filename, comment })
  }

  const payload = await getPayloadClient()
  const result = await payload.find({
    collection: 'albums',
    where: { approvalToken: { equals: token } },
    limit: 1,
    depth: 0,
  })
  const album = result.docs[0]
  if (!album) return { ok: false, status: 404, error: 'Invalid token' }
  if (album.approvalStatus === 'approved') {
    return { ok: false, status: 409, error: 'Album already approved' }
  }

  const count = clean.length
  if (album.selectionMin && count < album.selectionMin) {
    return { ok: false, status: 422, error: `Please select at least ${album.selectionMin} images` }
  }
  if (album.selectionMax && count > album.selectionMax) {
    return { ok: false, status: 422, error: `Please select at most ${album.selectionMax} images` }
  }

  await payload.update({
    collection: 'albums',
    id: album.id,
    data: {
      selections: clean,
      approvalStatus: 'submitted',
      publicationConsent: Boolean(publicationConsent),
    },
  })

  return { ok: true }
}

// --------------------------------------------------------------------------
// Reviews / testimonials
// --------------------------------------------------------------------------

/** Approved reviews for the testimonials section. Returns [] on failure so the page still renders. */
export async function fetchApprovedReviews(): Promise<PublicReview[]> {
  try {
    const payload = await getPayloadClient()
    const result = await payload.find({
      collection: 'reviews',
      where: { approved: { equals: true } },
      sort: '-createdAt',
      limit: 50,
      depth: 1,
    })
    return result.docs.map((r) => {
      const avatar = r.avatar && typeof r.avatar === 'object' ? r.avatar : null
      return {
        id: r.id,
        name: r.name,
        role: r.role,
        quote: r.quote,
        // Payload prefixes serverURL; keep it same-origin so it works on any host
        avatarUrl: avatar?.url ? new URL(avatar.url, 'http://local').pathname : null,
        communication: r.communication ?? 0,
        creativity: r.creativity ?? 0,
        professionalism: r.professionalism ?? 0,
        value: r.value ?? 0,
      }
    })
  } catch (err) {
    console.error('[reviews] failed to load approved reviews:', err)
    return []
  }
}

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

const AVATAR_MAX_BYTES = 2_000_000
const AVATAR_RE = /^data:(image\/(?:jpeg|png|webp));base64,([A-Za-z0-9+/=]+)$/

function rating(v: unknown): number {
  const n = Math.round(Number(v))
  return Number.isFinite(n) ? Math.min(5, Math.max(1, n)) : 5
}

export async function submitReview(
  data: SubmitReviewPayload,
): Promise<{ ok: boolean; status?: number; error?: string }> {
  const name = typeof data?.name === 'string' ? data.name.trim().slice(0, 100) : ''
  const quote = typeof data?.quote === 'string' ? data.quote.trim().slice(0, 3000) : ''
  const role = typeof data?.role === 'string' ? data.role.trim().slice(0, 120) : undefined
  if (!name || !quote) return { ok: false, status: 400, error: 'Name and review are required' }

  const payload = await getPayloadClient()

  // Avatar: only accept an inline data URL of a supported image type — never fetch a URL.
  let avatarId: number | undefined
  if (data.avatarBase64) {
    const m = typeof data.avatarBase64 === 'string' ? data.avatarBase64.match(AVATAR_RE) : null
    if (!m) return { ok: false, status: 400, error: 'Unsupported photo format' }
    const buffer = Buffer.from(m[2], 'base64')
    if (buffer.byteLength > AVATAR_MAX_BYTES) {
      return { ok: false, status: 413, error: 'Photo is too large' }
    }
    try {
      const ext = m[1].split('/')[1].replace('jpeg', 'jpg')
      const media = await payload.create({
        collection: 'media',
        data: { alt: name },
        file: {
          data: buffer,
          mimetype: m[1],
          name: `avatar-${Date.now()}.${ext}`,
          size: buffer.byteLength,
        },
      })
      avatarId = media.id
    } catch (err) {
      console.error('[reviews] avatar upload failed (continuing without avatar):', err)
    }
  }

  let albumId: number | undefined
  if (typeof data.albumSlug === 'string' && data.albumSlug) {
    const album = await payload.find({
      collection: 'albums',
      where: { slug: { equals: data.albumSlug } },
      limit: 1,
      depth: 0,
      select: { slug: true },
    })
    albumId = album.docs[0]?.id
  }

  await payload.create({
    collection: 'reviews',
    data: {
      name,
      role,
      quote,
      communication: rating(data.communication),
      creativity: rating(data.creativity),
      professionalism: rating(data.professionalism),
      value: rating(data.value),
      approved: false,
      ...(avatarId && { avatar: avatarId }),
      ...(albumId && { album: albumId }),
    },
  })

  return { ok: true }
}
