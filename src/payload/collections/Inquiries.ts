import type { CollectionConfig } from 'payload'

// Requests from "Plan your shoot" on /sessions, created by /api/inquiry-submissions.
export const Inquiries: CollectionConfig = {
  slug: 'inquiries',
  admin: {
    useAsTitle: 'name',
    group: 'Inbox',
    defaultColumns: ['name', 'offering', 'date', 'status', 'createdAt'],
  },
  access: {
    read: ({ req }) => Boolean(req.user),
    create: ({ req }) => Boolean(req.user),
    update: ({ req }) => Boolean(req.user),
    delete: ({ req }) => Boolean(req.user),
  },
  defaultSort: '-createdAt',
  fields: [
    {
      type: 'row',
      fields: [
        {
          name: 'status',
          type: 'select',
          defaultValue: 'new',
          options: [
            { label: 'New', value: 'new' },
            { label: 'Replied', value: 'replied' },
            { label: 'Booked', value: 'booked' },
            { label: 'Declined', value: 'declined' },
          ],
        },
        { name: 'locale', type: 'text', admin: { readOnly: true } },
      ],
    },
    { name: 'offering', type: 'relationship', relationTo: 'offerings' },
    { name: 'kind', type: 'text', admin: { description: 'Free text when "something else" was chosen' } },
    {
      type: 'row',
      fields: [
        { name: 'date', type: 'date', admin: { date: { pickerAppearance: 'dayOnly' } } },
        { name: 'dateFlexible', type: 'checkbox', defaultValue: false },
      ],
    },
    { name: 'location', type: 'text' },
    {
      type: 'row',
      fields: [
        {
          name: 'size',
          type: 'select',
          options: [
            { label: 'Small', value: 'small' },
            { label: 'Medium', value: 'medium' },
            { label: 'Large', value: 'large' },
          ],
        },
        {
          name: 'budget',
          type: 'select',
          options: [
            { label: 'Up to €200', value: 'lt200' },
            { label: '€200–500', value: '200-500' },
            { label: '€500–1000', value: '500-1000' },
            { label: 'Over €1000', value: 'gt1000' },
            { label: 'Not sure yet', value: 'unsure' },
          ],
        },
      ],
    },
    {
      type: 'row',
      fields: [
        { name: 'name', type: 'text', required: true },
        { name: 'email', type: 'email', required: true },
        { name: 'phone', type: 'text' },
      ],
    },
    { name: 'message', type: 'textarea' },
    { name: 'photo', type: 'relationship', relationTo: 'photos', admin: { description: 'The photo that inspired the request' } },
    { name: 'notes', type: 'textarea', admin: { description: 'Internal notes' } },
  ],
}
