// Stripe webhook: verifies the signature, handles each event once, and ignores
// events of other apps on the same Stripe account.
import { NextRequest, NextResponse } from 'next/server'
import type Stripe from 'stripe'
import { getPayloadClient } from '@/lib/payload'
import { getStripe } from '@/lib/stripe'
import { applyCheckoutSession, applyRefund } from '@/lib/payments'

export async function POST(req: NextRequest) {
  const stripe = getStripe()
  const secret = process.env.STRIPE_WEBHOOK_SECRET
  if (!stripe || !secret) return NextResponse.json({ error: 'Payments are not configured' }, { status: 503 })

  let event: Stripe.Event
  try {
    event = stripe.webhooks.constructEvent(await req.text(), req.headers.get('stripe-signature') ?? '', secret)
  } catch {
    return NextResponse.json({ error: 'Invalid signature' }, { status: 400 })
  }

  const payload = await getPayloadClient()
  const seen = await payload.count({ collection: 'stripe-events', where: { eventId: { equals: event.id } }, overrideAccess: true })
  if (seen.totalDocs) return NextResponse.json({ ok: true, duplicate: true })

  let handled = false
  try {
    switch (event.type) {
      case 'checkout.session.completed':
      case 'checkout.session.expired':
        handled = await applyCheckoutSession(payload, event.data.object)
        break
      case 'checkout.session.async_payment_succeeded':
        handled = await applyCheckoutSession(payload, event.data.object, 'succeeded')
        break
      case 'checkout.session.async_payment_failed':
        handled = await applyCheckoutSession(payload, event.data.object, 'failed')
        break
      case 'charge.refunded':
        handled = await applyRefund(payload, event.data.object)
        break
    }
  } catch (err) {
    console.error(`[stripe] ${event.type} ${event.id} failed:`, err)
    return NextResponse.json({ error: 'Processing failed' }, { status: 500 }) // Stripe retries
  }

  if (handled) {
    await payload
      .create({ collection: 'stripe-events', data: { eventId: event.id, type: event.type }, overrideAccess: true })
      .catch(() => {}) // a parallel delivery recorded it already
  }
  return NextResponse.json({ ok: true, handled })
}
