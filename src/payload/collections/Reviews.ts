import type { CollectionConfig } from 'payload'
import { sendNewReviewNotification } from '../../lib/email-payload'

export const Reviews: CollectionConfig = {
  slug: 'reviews',
  admin: {
    useAsTitle: 'name',
    defaultColumns: ['name', 'album', 'approved', 'createdAt'],
  },
  access: {
    // Anyone can read approved reviews; unauthenticated users can create (submit).
    read: () => true,
    create: () => true,
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
