import type { CollectionConfig } from 'payload'

// People who book shoots. They sign in to the portal (/c) with a one-time email
// link (src/lib/client-auth.ts) — there are no client passwords, and clients
// are separate from the admin users.
export const Clients: CollectionConfig = {
  slug: 'clients',
  admin: {
    useAsTitle: 'name',
    group: 'Clients',
    defaultColumns: ['name', 'email', 'locale', 'lastLoginAt'],
  },
  access: {
    read: ({ req }) => Boolean(req.user),
    create: ({ req }) => Boolean(req.user),
    update: ({ req }) => Boolean(req.user),
    delete: ({ req }) => Boolean(req.user),
  },
  hooks: {
    beforeValidate: [
      ({ data }) => {
        if (data?.email) data.email = String(data.email).trim().toLowerCase()
        return data
      },
    ],
    beforeChange: [
      ({ data, originalDoc }) => {
        if (data.signOutEverywhere) {
          data.sessionVersion = (originalDoc?.sessionVersion ?? 1) + 1
          data.signOutEverywhere = false
        }
        return data
      },
    ],
  },
  fields: [
    {
      type: 'row',
      fields: [
        { name: 'name', type: 'text', required: true },
        { name: 'email', type: 'email', required: true, unique: true, index: true },
      ],
    },
    {
      type: 'row',
      fields: [
        {
          name: 'locale',
          type: 'select',
          defaultValue: 'en',
          options: [
            { label: 'English', value: 'en' },
            { label: 'Deutsch', value: 'de' },
          ],
          admin: { description: 'Language of emails and the portal' },
        },
        { name: 'phone', type: 'text' },
      ],
    },
    {
      name: 'projects',
      type: 'join',
      collection: 'projects',
      on: 'clients',
    },
    { name: 'notes', type: 'textarea', admin: { description: 'Internal notes' } },
    { name: 'lastLoginAt', type: 'date', admin: { readOnly: true, position: 'sidebar' } },
    {
      name: 'signOutEverywhere',
      type: 'checkbox',
      defaultValue: false,
      admin: { position: 'sidebar', description: 'Ends all portal sessions of this client on save' },
    },
    // Login state — never shown or editable in the admin
    { name: 'loginTokenHash', type: 'text', index: true, hidden: true },
    { name: 'loginTokenExpiresAt', type: 'date', hidden: true },
    { name: 'sessionVersion', type: 'number', defaultValue: 1, hidden: true },
  ],
}
