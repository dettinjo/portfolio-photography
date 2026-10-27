import type { CollectionConfig } from 'payload'

// Stripe event ids already handled, so a redelivered webhook is applied once.
export const StripeEvents: CollectionConfig = {
  slug: 'stripe-events',
  admin: { hidden: true },
  access: {
    read: ({ req }) => Boolean(req.user),
    create: () => false,
    update: () => false,
    delete: () => false,
  },
  fields: [
    { name: 'eventId', type: 'text', required: true, unique: true, index: true },
    { name: 'type', type: 'text' },
  ],
}
