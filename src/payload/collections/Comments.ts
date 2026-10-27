import type { CollectionConfig } from 'payload'

// Notes on a preview, optionally pinned to a point (x/y as 0–1 of the image),
// so they read as an edit list. Clients write them in the portal; the
// photographer can answer or resolve them in the admin.
export const Comments: CollectionConfig = {
  slug: 'comments',
  admin: {
    useAsTitle: 'body',
    group: 'Inbox',
    defaultColumns: ['body', 'photo', 'client', 'resolved', 'createdAt'],
  },
  access: {
    read: ({ req }) => Boolean(req.user),
    create: ({ req }) => Boolean(req.user),
    update: ({ req }) => Boolean(req.user),
    delete: ({ req }) => Boolean(req.user),
  },
  defaultSort: '-createdAt',
  fields: [
    { name: 'project', type: 'relationship', relationTo: 'projects', required: true, index: true },
    { name: 'photo', type: 'relationship', relationTo: 'photos', required: true, index: true },
    {
      type: 'row',
      fields: [
        { name: 'client', type: 'relationship', relationTo: 'clients', admin: { description: 'Empty: written by you' } },
        { name: 'resolved', type: 'checkbox', defaultValue: false },
      ],
    },
    { name: 'body', type: 'textarea', required: true },
    {
      type: 'row',
      fields: [
        { name: 'x', type: 'number', min: 0, max: 1, admin: { description: 'Pin position, 0–1 from the left' } },
        { name: 'y', type: 'number', min: 0, max: 1, admin: { description: 'Pin position, 0–1 from the top' } },
      ],
    },
  ],
}
