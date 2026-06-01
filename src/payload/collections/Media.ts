import type { CollectionConfig } from 'payload'
import path from 'path'
import { fileURLToPath } from 'url'

const dirname = path.dirname(fileURLToPath(import.meta.url))

export const Media: CollectionConfig = {
  slug: 'media',
  access: { read: () => true },
  upload: {
    staticDir: path.resolve(dirname, '../../../public/media'),
    mimeTypes: [
      'image/jpeg',
      'image/png',
      'image/webp',
      'image/avif',
      'image/gif',
      'image/tiff',
    ],
    // Auto-convert every raster upload to WebP
    formatOptions: {
      format: 'webp',
      options: { quality: 85 },
    },
    // Cap at 3000px on the longest edge — no upscaling
    resizeOptions: {
      width: 3000,
      height: 3000,
      fit: 'inside',
      withoutEnlargement: true,
    },
  },
  fields: [
    { name: 'alt', type: 'text' },
  ],
}
