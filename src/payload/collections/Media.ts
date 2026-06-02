import type { CollectionConfig } from 'payload'

export const Media: CollectionConfig = {
  slug: 'media',
  access: { read: () => true },
  upload: {
    staticDir: '/app/public/media',
    mimeTypes: ['image/jpeg', 'image/png', 'image/webp', 'image/avif', 'image/gif', 'image/tiff'],
    formatOptions: { format: 'webp', options: { quality: 85 } },
    resizeOptions: { width: 3000, height: 3000, fit: 'inside', withoutEnlargement: true },
  },
  fields: [{ name: 'alt', type: 'text' }],
}
