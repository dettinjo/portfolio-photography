import type { CollectionConfig, Where } from 'payload'

// Client previews and finals are never public, whatever their visibility says
const publiclyVisible: Where = {
  and: [
    { status: { equals: 'ready' } },
    { visibility: { equals: 'public' } },
    { purpose: { equals: 'portfolio' } },
  ],
}

// One record per image file in Nextcloud, identified by its Nextcloud file id
// (stable across renames and moves). Files are processed by src/lib/sync.
export const Photos: CollectionConfig = {
  slug: 'photos',
  admin: {
    useAsTitle: 'filename',
    group: 'Portfolio',
    defaultColumns: ['filename', 'series', 'project', 'status', 'visibility', 'takenAt'],
    listSearchableFields: ['filename', 'title'],
  },
  access: {
    read: ({ req }) => (req.user ? true : publiclyVisible),
    create: ({ req }) => Boolean(req.user),
    update: ({ req }) => Boolean(req.user),
    delete: ({ req }) => Boolean(req.user),
  },
  fields: [
    {
      type: 'row',
      fields: [
        {
          name: 'purpose',
          type: 'select',
          defaultValue: 'portfolio',
          index: true,
          options: [
            { label: 'Portfolio', value: 'portfolio' },
            { label: 'Client preview', value: 'preview' },
            { label: 'Final (delivered)', value: 'final' },
          ],
          admin: { readOnly: true },
        },
        { name: 'series', type: 'relationship', relationTo: 'series', index: true },
        { name: 'project', type: 'relationship', relationTo: 'projects', index: true },
      ],
    },
    {
      type: 'row',
      fields: [
        {
          name: 'visibility',
          type: 'select',
          defaultValue: 'public',
          options: [
            { label: 'Public', value: 'public' },
            { label: 'Hidden', value: 'hidden' },
          ],
        },
        {
          name: 'order',
          type: 'number',
          admin: { description: 'Optional manual position; otherwise capture time.' },
        },
      ],
    },
    {
      name: 'title',
      type: 'text',
      localized: true,
      admin: { description: 'Overrides the Lightroom title.' },
    },
    {
      name: 'caption',
      type: 'textarea',
      localized: true,
      admin: { description: 'Overrides the Lightroom caption.' },
    },
    {
      name: 'alt',
      type: 'text',
      localized: true,
      admin: { description: 'Image description for screen readers and search engines.' },
    },
    {
      type: 'collapsible',
      label: 'From Lightroom',
      admin: { initCollapsed: true },
      fields: [
        {
          name: 'meta',
          type: 'group',
          admin: { readOnly: true },
          fields: [
            { name: 'title', type: 'text' },
            { name: 'caption', type: 'textarea' },
            { name: 'keywords', type: 'text', hasMany: true },
            { name: 'rating', type: 'number' },
            { name: 'camera', type: 'text' },
            { name: 'lens', type: 'text' },
            { name: 'focalLength', type: 'number' },
            { name: 'aperture', type: 'number' },
            { name: 'exposureTime', type: 'number' },
            { name: 'iso', type: 'number' },
          ],
        },
        { name: 'takenAt', type: 'date', index: true, admin: { readOnly: true } },
      ],
    },
    {
      type: 'collapsible',
      label: 'Processing',
      admin: { initCollapsed: true },
      fields: [
        {
          name: 'status',
          type: 'select',
          defaultValue: 'pending',
          index: true,
          options: [
            { label: 'Pending', value: 'pending' },
            { label: 'Ready', value: 'ready' },
            { label: 'Failed', value: 'failed' },
            { label: 'Missing in Nextcloud', value: 'missing' },
            { label: 'Expired (files deleted)', value: 'expired' },
          ],
          admin: { readOnly: true },
        },
        { name: 'error', type: 'text', admin: { readOnly: true } },
        { name: 'filename', type: 'text', required: true, admin: { readOnly: true } },
        { name: 'ncFileId', type: 'number', required: true, unique: true, index: true, admin: { readOnly: true } },
        { name: 'ncPath', type: 'text', admin: { readOnly: true } },
        { name: 'etag', type: 'text', admin: { readOnly: true } },
        {
          name: 'version',
          type: 'text',
          admin: { readOnly: true, description: 'Changes whenever the file is re-exported.' },
        },
        { name: 'bytes', type: 'number', admin: { readOnly: true, description: 'Size of the original file' } },
        { name: 'width', type: 'number', admin: { readOnly: true } },
        { name: 'height', type: 'number', admin: { readOnly: true } },
        { name: 'widths', type: 'number', hasMany: true, admin: { readOnly: true } },
        { name: 'placeholder', type: 'text', admin: { readOnly: true } },
        { name: 'color', type: 'text', admin: { readOnly: true } },
        { name: 'watermark', type: 'text', admin: { readOnly: true, description: 'Text burned into the preview' } },
      ],
    },
  ],
}
