import type { CollectionConfig } from 'payload'

// Ways to work together, shown on /sessions. An offering is only shown when its
// genre has at least one published series (decision D1 in docs/REDESIGN.md).
export const Offerings: CollectionConfig = {
  slug: 'offerings',
  admin: {
    useAsTitle: 'title',
    group: 'Sessions',
    defaultColumns: ['title', 'genre', 'fromPrice', 'order'],
    description: 'Shown on /sessions once the genre has a published series.',
  },
  access: {
    read: () => true,
    create: ({ req }) => Boolean(req.user),
    update: ({ req }) => Boolean(req.user),
    delete: ({ req }) => Boolean(req.user),
  },
  defaultSort: 'order',
  fields: [
    { name: 'title', type: 'text', required: true, localized: true },
    { name: 'slug', type: 'text', required: true, unique: true, index: true },
    { name: 'genre', type: 'relationship', relationTo: 'genres', required: true },
    { name: 'tagline', type: 'text', localized: true, admin: { description: 'One line: who it is for.' } },
    {
      name: 'includes',
      type: 'textarea',
      localized: true,
      admin: { description: 'What you get — one item per line.' },
    },
    {
      type: 'row',
      fields: [
        { name: 'duration', type: 'text', localized: true, admin: { description: 'e.g. "1 h" or "up to 3 h"' } },
        { name: 'deliveryDays', type: 'number', admin: { description: 'Days until delivery' } },
      ],
    },
    {
      type: 'row',
      fields: [
        { name: 'fromPrice', type: 'number', admin: { description: '€, empty = on request' } },
        { name: 'depositPercent', type: 'number', defaultValue: 30 },
      ],
    },
    {
      type: 'row',
      fields: [
        { name: 'imageQuota', type: 'number', admin: { description: 'Edited images included' } },
        { name: 'extraImagePrice', type: 'number', admin: { description: '€ per extra image' } },
        { name: 'revisionRounds', type: 'number', defaultValue: 1 },
      ],
    },
    { name: 'order', type: 'number', defaultValue: 0 },
  ],
}
