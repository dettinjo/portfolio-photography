// Pay the balance: { project: slug }. Returns a Stripe Checkout URL for what is
// still open (computed here, never sent by the browser).
import { NextRequest } from 'next/server'
import { getPayloadClient } from '@/lib/payload'
import { json, portalRequest } from '@/lib/portal-api'
import { PaymentError, startCheckout } from '@/lib/payments'
import { stripeEnabled } from '@/lib/stripe'

export async function POST(req: NextRequest) {
  const r = await portalRequest(req, 10)
  if (r instanceof Response) return r
  const { client, project } = r
  if (!stripeEnabled()) return json({ error: 'Online payment is not available' }, 409)
  try {
    const url = await startCheckout(await getPayloadClient(), project, client, client.locale === 'de' ? 'de' : 'en', 'balance')
    return json({ ok: true, url })
  } catch (err) {
    if (err instanceof PaymentError) return json({ error: err.message }, 409)
    console.error('[pay] checkout failed:', err)
    return json({ error: 'Payment could not be started' }, 502)
  }
}
