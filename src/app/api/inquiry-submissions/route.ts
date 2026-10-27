// "Plan your shoot" submissions from /sessions (not /api/inquiries, which is
// Payload's REST endpoint used by the admin panel). Stored as an inquiry, then a
// notification and a confirmation email are sent (a mail failure does not
// lose the inquiry).
import { NextRequest, NextResponse } from 'next/server'
import { getPayloadClient } from '@/lib/payload'
import { clientIp, isEmail, rateLimit, singleLine } from '@/lib/security'
import { sendInquiryConfirmation, sendInquiryNotification } from '@/lib/email-inquiry'

const SIZES = ['small', 'medium', 'large'] as const
const BUDGETS = ['lt200', '200-500', '500-1000', 'gt1000', 'unsure'] as const
const BUDGET_LABEL: Record<(typeof BUDGETS)[number], string> = {
  lt200: '≤ €200',
  '200-500': '€200–500',
  '500-1000': '€500–1000',
  gt1000: '> €1000',
  unsure: '?',
}

const str = (v: unknown, max: number) => (typeof v === 'string' ? v.trim().slice(0, max) : '')
const oneOf = <T extends string>(v: unknown, list: readonly T[]) => (list.includes(v as T) ? (v as T) : undefined)

export async function POST(req: NextRequest) {
  if (!rateLimit(`inquiry:${clientIp(req)}`, 5, 10 * 60 * 1000)) {
    return NextResponse.json({ error: 'Too many requests. Please try again later.' }, { status: 429 })
  }

  let body: Record<string, unknown>
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
  }

  // Honeypot: real visitors never fill the hidden "website" field.
  if (body.website) return NextResponse.json({ ok: true })

  const name = singleLine(body.name, 100)
  const email = singleLine(body.email, 254)
  if (!name || !isEmail(email)) {
    return NextResponse.json({ error: 'Name and a valid email are required' }, { status: 400 })
  }

  const locale = body.locale === 'de' ? 'de' : 'en'
  const date = /^\d{4}-\d{2}-\d{2}$/.test(str(body.date, 10)) ? str(body.date, 10) : undefined
  const size = oneOf(body.size, SIZES)
  const budget = oneOf(body.budget, BUDGETS)
  const offeringId = Number.isInteger(body.offering) ? (body.offering as number) : undefined
  const requestedPhoto = Number.isInteger(body.photo) ? (body.photo as number) : undefined

  try {
    const payload = await getPayloadClient()
    const offering = offeringId
      ? await payload.findByID({ collection: 'offerings', id: offeringId, locale, depth: 0 }).catch(() => null)
      : null

    // Only link a photo that exists and is public
    const photoId = requestedPhoto
      ? (await payload
          .findByID({ collection: 'photos', id: requestedPhoto, depth: 0, overrideAccess: false })
          .catch(() => null))?.id
      : undefined

    const inquiry = await payload.create({
      collection: 'inquiries',
      data: {
        status: 'new',
        locale,
        offering: offering?.id,
        kind: offering ? undefined : str(body.kind, 200) || undefined,
        date,
        dateFlexible: Boolean(body.dateFlexible),
        location: str(body.location, 200) || undefined,
        size,
        budget,
        name,
        email,
        phone: singleLine(body.phone, 40) || undefined,
        message: str(body.message, 5000) || undefined,
        photo: photoId,
      },
    })

    const mail = {
      id: inquiry.id,
      locale,
      name,
      email,
      phone: inquiry.phone ?? undefined,
      offering: offering?.title,
      kind: inquiry.kind ?? undefined,
      date,
      dateFlexible: Boolean(body.dateFlexible),
      location: inquiry.location ?? undefined,
      size,
      budget: budget ? BUDGET_LABEL[budget] : undefined,
      message: inquiry.message ?? undefined,
      photoUrl: photoId ? `https://${process.env.NEXT_PUBLIC_PHOTOGRAPHY_DOMAIN}/p/${photoId}` : undefined,
    } as const
    await Promise.all([
      sendInquiryNotification(mail).catch((err) => console.error('[inquiries] notification failed:', err)),
      sendInquiryConfirmation(mail).catch((err) => console.error('[inquiries] confirmation failed:', err)),
    ])

    return NextResponse.json({ ok: true })
  } catch (err) {
    console.error('[inquiries] failed:', err)
    return NextResponse.json({ error: 'Submission failed' }, { status: 500 })
  }
}
