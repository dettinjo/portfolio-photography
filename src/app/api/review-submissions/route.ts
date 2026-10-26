// Public endpoint for the "leave a review" form. Reviews are stored unapproved
// and only appear on the site after approval in the admin panel.
import { NextRequest, NextResponse } from 'next/server'
import { submitReview } from '@/lib/payload'
import { clientIp, rateLimit } from '@/lib/security'

export async function POST(req: NextRequest) {
  if (!rateLimit(`review:${clientIp(req)}`, 3, 60 * 60 * 1000)) {
    return NextResponse.json({ error: 'Too many submissions. Please try again later.' }, { status: 429 })
  }

  let data: Record<string, unknown>
  try {
    data = await req.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
  }

  // Honeypot: real visitors never fill the hidden "website" field.
  if (data.website) return NextResponse.json({ ok: true })

  try {
    const result = await submitReview(data as unknown as Parameters<typeof submitReview>[0])
    if (!result.ok) return NextResponse.json({ error: result.error }, { status: result.status ?? 400 })
    return NextResponse.json({ ok: true })
  } catch (err) {
    console.error('[review-submissions] failed:', err)
    return NextResponse.json({ error: 'Submission failed' }, { status: 500 })
  }
}
