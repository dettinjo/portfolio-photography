import type { CollectionConfig } from 'payload'
import { sendNewReviewNotification } from '../../lib/email-payload'

export const Reviews: CollectionConfig = {
  slug: 'reviews',
  admin: {
    useAsTitle: 'name',
    group: 'Inbox',
    defaultColumns: ['name', 'project', 'series', 'approved', 'createdAt'],
    description: 'Public after approval: on /kind-words and on the chosen series page.',
  },
  access: {
    // The public sees approved reviews only. Submissions go through
    // /api/review-submissions (rate limited) which uses the Local API.
    read: ({ req }) => (req.user ? true : { approved: { equals: true } }),
    create: ({ req }) => Boolean(req.user),
    update: ({ req }) => Boolean(req.user),
    delete: ({ req }) => Boolean(req.user),
  },
  hooks: {
    afterChange: [
      async ({ doc, operation }) => {
        // Notify admin whenever a new review is submitted publicly
        if (operation === 'create') {
          const albumTitle =
            typeof doc.album === 'object' && doc.album !== null
              ? (doc.album as { title?: string }).title
              : undefined

          await sendNewReviewNotification({
            reviewerName: doc.name,
            albumTitle,
            quote: doc.quote,
          }).catch((err: Error) =>
            console.error('[reviews] failed to send new-review notification:', err),
          )
        }
        return doc
      },
    ],
  },
  fields: [
    {
      type: 'row',
      fields: [
        { name: 'project', type: 'relationship', relationTo: 'projects', admin: { readOnly: true } },
        { name: 'client', type: 'relationship', relationTo: 'clients', admin: { readOnly: true } },
        {
          name: 'series',
          type: 'relationship',
          relationTo: 'series',
          admin: { description: 'Also show it on this series page' },
        },
      ],
    },
    {
      name: 'favouritePhoto',
      type: 'relationship',
      relationTo: 'photos',
      admin: { readOnly: true, description: "The client's favourite delivered photo" },
    },
    {
      name: 'album',
      type: 'relationship',
      relationTo: 'albums',
      admin: { description: 'Link this review to a specific album (optional).' },
    },
    { name: 'name', type: 'text', required: true },
    { name: 'role', type: 'text', admin: { description: 'e.g. "Bride & Groom" or "Corporate Client"' } },
    { name: 'quote', type: 'textarea', required: true },
    {
      name: 'avatar',
      type: 'upload',
      relationTo: 'media',
    },
    {
      type: 'row',
      fields: [
        { name: 'communication', type: 'number', min: 1, max: 5, defaultValue: 5 },
        { name: 'creativity', type: 'number', min: 1, max: 5, defaultValue: 5 },
        { name: 'professionalism', type: 'number', min: 1, max: 5, defaultValue: 5 },
        { name: 'value', type: 'number', min: 1, max: 5, defaultValue: 5 },
      ],
    },
    {
      name: 'approved',
      type: 'checkbox',
      defaultValue: false,
      admin: { description: 'Only approved reviews appear on the public portfolio.' },
    },
  ],
}
