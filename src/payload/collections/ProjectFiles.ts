import path from 'path'
import type { CollectionConfig } from 'payload'

// Images clients add to a project (moodboard). Private: only admins read them
// through Payload; clients see them via /api/portal/files with a session check.
export const PROJECT_FILES_DIR = path.join(process.env.MEDIA_DIR ?? '/app/public/media', 'project-files')

export const ProjectFiles: CollectionConfig = {
  slug: 'project-files',
  labels: { singular: 'Project file', plural: 'Project files' },
  admin: {
    useAsTitle: 'filename',
    group: 'Clients',
    defaultColumns: ['filename', 'project', 'client', 'kind', 'createdAt'],
  },
  access: {
    read: ({ req }) => Boolean(req.user),
    create: ({ req }) => Boolean(req.user),
    update: ({ req }) => Boolean(req.user),
    delete: ({ req }) => Boolean(req.user),
  },
  upload: {
    staticDir: PROJECT_FILES_DIR,
    // No HEIC: sharp cannot read it; iPhones convert to JPEG when uploading from the browser
    mimeTypes: ['image/jpeg', 'image/png', 'image/webp', 'image/gif'],
    formatOptions: { format: 'webp', options: { quality: 82 } },
    resizeOptions: { width: 2400, height: 2400, fit: 'inside', withoutEnlargement: true },
    imageSizes: [{ name: 'thumb', width: 600, height: 600, fit: 'inside', withoutEnlargement: true, formatOptions: { format: 'webp', options: { quality: 75 } } }],
  },
  fields: [
    { name: 'project', type: 'relationship', relationTo: 'projects', required: true, index: true },
    { name: 'client', type: 'relationship', relationTo: 'clients' },
    {
      name: 'kind',
      type: 'select',
      defaultValue: 'moodboard',
      options: [{ label: 'Moodboard', value: 'moodboard' }],
    },
    { name: 'note', type: 'text' },
  ],
}
