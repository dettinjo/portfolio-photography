import type { CollectionConfig } from 'payload'

// Devices that asked for notifications: a client's phone, or the photographer's.
// Created from the portal and /studio; expired ones are removed when a push fails.
export const PushSubscriptions: CollectionConfig = {
  slug: 'push-subscriptions',
  labels: { singular: 'Push device', plural: 'Push devices' },
  admin: {
    useAsTitle: 'device',
    group: 'Clients',
    defaultColumns: ['device', 'client', 'user', 'lastUsedAt', 'createdAt'],
  },
  access: {
    read: ({ req }) => Boolean(req.user),
    create: () => false,
    update: () => false,
    delete: ({ req }) => Boolean(req.user),
  },
  fields: [
    { name: 'endpoint', type: 'text', required: true, unique: true, index: true },
    {
      type: 'row',
      fields: [
        { name: 'p256dh', type: 'text', required: true },
        { name: 'auth', type: 'text', required: true },
      ],
    },
    {
      type: 'row',
      fields: [
        { name: 'client', type: 'relationship', relationTo: 'clients', index: true },
        { name: 'user', type: 'relationship', relationTo: 'users', index: true, admin: { description: 'The photographer' } },
      ],
    },
    { name: 'device', type: 'text', admin: { description: 'Browser / system' } },
    { name: 'locale', type: 'text' },
    { name: 'lastUsedAt', type: 'date' },
  ],
}
