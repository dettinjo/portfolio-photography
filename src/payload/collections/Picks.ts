import type { CollectionConfig } from 'payload'

// A client's favourite in a proofing gallery: one record per client and photo.
// Written by /api/portal/picks; the merged picks become selection.txt.
export const Picks: CollectionConfig = {
  slug: 'picks',
  admin: {
    group: 'Clients',
    defaultColumns: ['photo', 'client', 'project', 'createdAt'],
  },
  access: {
    read: ({ req }) => Boolean(req.user),
    create: ({ req }) => Boolean(req.user),
    update: ({ req }) => Boolean(req.user),
    delete: ({ req }) => Boolean(req.user),
  },
  defaultSort: '-createdAt',
  indexes: [{ fields: ['photo', 'client'], unique: true }],
  fields: [
    { name: 'project', type: 'relationship', relationTo: 'projects', required: true, index: true },
    { name: 'photo', type: 'relationship', relationTo: 'photos', required: true, index: true },
    { name: 'client', type: 'relationship', relationTo: 'clients', required: true },
  ],
}
