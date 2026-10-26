import type { CollectionConfig } from 'payload'

// One series per folder below Lightroom/Portfolio in Nextcloud. Created and kept
// in sync automatically (src/lib/sync); editorial fields can be edited here.
export const Series: CollectionConfig = {
  slug: 'series',
  admin: {
    useAsTitle: 'title',
    group: 'Portfolio',
    defaultColumns: ['title', 'slug', 'genre', 'draft', 'photoCount', 'updatedAt'],
    description:
      'Created from the folders in Nextcloud → Lightroom/Portfolio. A folder name starting with "_" is a draft.',
  },
  access: {
    read: ({ req }) => (req.user ? true : { draft: { not_equals: true } }),
    create: ({ req }) => Boolean(req.user),
    update: ({ req }) => Boolean(req.user),
    delete: ({ req }) => Boolean(req.user),
  },
  defaultSort: 'order',
  fields: [
    { name: 'title', type: 'text', required: true, localized: true },
    {
      name: 'slug',
      type: 'text',
      required: true,
      unique: true,
      index: true,
      admin: { description: 'URL of the series. Kept stable when the folder is renamed.' },
    },
    { name: 'story', type: 'textarea', localized: true },
    { name: 'genre', type: 'relationship', relationTo: 'genres' },
    {
      name: 'cover',
      type: 'relationship',
      relationTo: 'photos',
      admin: { description: 'Defaults to the first 5-star photo, otherwise the first photo.' },
    },
    { name: 'order', type: 'number', defaultValue: 0 },
    {
      name: 'draft',
      type: 'checkbox',
      defaultValue: false,
      admin: { description: 'Hidden from the public site. Set from the folder name ("_" prefix) when the folder is created or renamed; can be changed here.' },
    },
    {
      type: 'collapsible',
      label: 'Nextcloud',
      admin: { initCollapsed: true },
      fields: [
        { name: 'ncFileId', type: 'number', unique: true, index: true, admin: { readOnly: true } },
        { name: 'ncPath', type: 'text', admin: { readOnly: true } },
        { name: 'photoCount', type: 'number', defaultValue: 0, admin: { readOnly: true } },
        { name: 'missing', type: 'checkbox', defaultValue: false, admin: { readOnly: true, description: 'The folder no longer exists in Nextcloud.' } },
      ],
    },
  ],
}
