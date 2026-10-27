import type { GlobalConfig } from 'payload'

// Text for /about and the FAQ (shown on /about and, where marked, on /sessions).
// Empty fields fall back to the built-in texts in messages/.
export const AboutPage: GlobalConfig = {
  slug: 'about-page',
  label: 'About & FAQ',
  admin: { group: 'Pages' },
  access: {
    read: () => true,
    update: ({ req }) => Boolean(req.user),
  },
  fields: [
    {
      name: 'portrait',
      type: 'upload',
      relationTo: 'media',
      admin: { description: 'Portrait on /about. Empty: the built-in photo.' },
    },
    {
      name: 'bio',
      type: 'textarea',
      localized: true,
      admin: { description: 'A blank line starts a new paragraph.' },
    },
    { name: 'approachTitle', type: 'text', localized: true },
    { name: 'approach', type: 'textarea', localized: true },
    {
      name: 'facts',
      type: 'array',
      admin: { description: 'Short facts next to the bio, e.g. "Based in" → "Stuttgart".' },
      fields: [
        { name: 'label', type: 'text', required: true, localized: true },
        { name: 'value', type: 'text', required: true, localized: true },
      ],
    },
    {
      name: 'faq',
      label: 'FAQ',
      type: 'array',
      fields: [
        { name: 'question', type: 'text', required: true, localized: true },
        {
          name: 'answer',
          type: 'textarea',
          required: true,
          localized: true,
          admin: { description: 'A blank line starts a new paragraph.' },
        },
        {
          name: 'onSessions',
          label: 'Also show on /sessions',
          type: 'checkbox',
          defaultValue: false,
        },
      ],
    },
  ],
}
