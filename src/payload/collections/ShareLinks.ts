import type { CollectionConfig } from 'payload'

// Guest links to a delivered gallery (docs/REDESIGN.md §7.2): created by a
// client in the portal, e.g. for family or wedding guests. View-only, with
// web-size downloads if allowed. They work while the gallery is online and
// until revoked. The token is the whole secret, so it is never listed publicly.
export const ShareLinks: CollectionConfig = {
  slug: 'share-links',
  admin: {
    useAsTitle: 'label',
    group: 'Clients',
    defaultColumns: ['label', 'project', 'downloads', 'views', 'revokedAt', 'createdAt'],
  },
  access: {
    read: ({ req }) => Boolean(req.user),
    create: () => false,
    update: ({ req }) => Boolean(req.user),
    delete: ({ req }) => Boolean(req.user),
  },
  defaultSort: '-createdAt',
  fields: [
    {
      type: 'row',
      fields: [
        { name: 'project', type: 'relationship', relationTo: 'projects', required: true, index: true },
        { name: 'createdBy', type: 'relationship', relationTo: 'clients', admin: { readOnly: true } },
      ],
    },
    { name: 'label', type: 'text', required: true, maxLength: 60 },
    { name: 'token', type: 'text', required: true, unique: true, index: true, admin: { readOnly: true, description: 'Link: /s/<token>' } },
    {
      type: 'row',
      fields: [
        { name: 'downloads', type: 'checkbox', defaultValue: false, admin: { description: 'Guests may download the web size' } },
        { name: 'revokedAt', type: 'date', admin: { description: 'Set to switch the link off' } },
      ],
    },
    {
      type: 'row',
      fields: [
        { name: 'views', type: 'number', defaultValue: 0, admin: { readOnly: true } },
        { name: 'lastViewedAt', type: 'date', admin: { readOnly: true } },
      ],
    },
  ],
}
