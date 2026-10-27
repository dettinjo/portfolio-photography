// Stripe client, or null when payments are not configured (the portal then
// records acceptance and the photographer arranges payment by hand).
// STRIPE_API_BASE points the SDK at stripe-mock in tests.
import 'server-only'
import Stripe from 'stripe'

let client: Stripe | null | undefined

export function getStripe(): Stripe | null {
  if (client !== undefined) return client
  const key = process.env.STRIPE_SECRET_KEY
  if (!key) return (client = null)
  const base = process.env.STRIPE_API_BASE ? new URL(process.env.STRIPE_API_BASE) : null
  client = new Stripe(key, {
    maxNetworkRetries: 2,
    timeout: 20_000,
    appInfo: { name: 'photosby-portfolio' },
    ...(base && {
      host: base.hostname,
      port: Number(base.port) || (base.protocol === 'https:' ? 443 : 80),
      protocol: base.protocol.replace(':', '') as 'http' | 'https',
    }),
  })
  return client
}

export const stripeEnabled = () => Boolean(process.env.STRIPE_SECRET_KEY)

/** Marks every Checkout this site creates, so events of other apps on the same Stripe account are ignored. */
export const METADATA_APP = 'photosby-portfolio'
