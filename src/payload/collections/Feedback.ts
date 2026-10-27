import type { CollectionConfig } from 'payload'

// Private reactions along the way (never published): after booking and after
// the sneak peek. Public reviews are separate (Reviews).
export const Feedback: CollectionConfig = {
  slug: 'feedback',
  labels: { singular: 'Feedback', plural: 'Feedback' },
  admin: {
    useAsTitle: 'comment',
    group: 'Inbox',
    defaultColumns: ['moment', 'rating', 'comment', 'client', 'project', 'createdAt'],
    description: 'Private — only you see this.',
  },
  access: {
    read: ({ req }) => Boolean(req.user),
    create: ({ req }) => Boolean(req.user),
    update: ({ req }) => Boolean(req.user),
    delete: ({ req }) => Boolean(req.user),
  },
  defaultSort: '-createdAt',
  indexes: [{ fields: ['project', 'client', 'moment'], unique: true }],
  fields: [
    {
      type: 'row',
      fields: [
        { name: 'project', type: 'relationship', relationTo: 'projects', required: true, index: true },
        { name: 'client', type: 'relationship', relationTo: 'clients', required: true },
      ],
    },
    {
      type: 'row',
      fields: [
        {
          name: 'moment',
          type: 'select',
          required: true,
          options: [
            { label: 'After booking', value: 'booking' },
            { label: 'After the sneak peek', value: 'sneak-peek' },
          ],
        },
        { name: 'rating', type: 'number', required: true, min: 1, max: 5 },
      ],
    },
    { name: 'comment', type: 'textarea' },
  ],
}
