import type { GlobalConfig } from 'payload'

// Add-ons and the price note shown on /sessions.
export const SessionsSettings: GlobalConfig = {
  slug: 'sessions-settings',
  label: 'Sessions page',
  admin: { group: 'Sessions' },
  access: {
    read: () => true,
    update: ({ req }) => Boolean(req.user),
  },
  fields: [
    {
      name: 'addOns',
      type: 'array',
      fields: [
        { name: 'label', type: 'text', required: true, localized: true },
        { name: 'price', type: 'text', required: true, localized: true, admin: { description: 'e.g. "+20 %", "€55 / h"' } },
      ],
    },
    { name: 'priceNote', type: 'text', localized: true },
  ],
}
