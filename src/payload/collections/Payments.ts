import type { CollectionConfig } from 'payload'

// One Stripe Checkout per record. Created by the site (amounts are always
// computed on the server), updated by the Stripe webhook and on the client's
// return from Checkout. Refunds are made in the Stripe Dashboard and synced here.
export const Payments: CollectionConfig = {
  slug: 'payments',
  admin: {
    useAsTitle: 'label',
    group: 'Clients',
    defaultColumns: ['label', 'project', 'amount', 'status', 'paidAt'],
  },
  access: {
    read: ({ req }) => Boolean(req.user),
    create: ({ req }) => Boolean(req.user),
    update: ({ req }) => Boolean(req.user),
    delete: () => false,
  },
  defaultSort: '-createdAt',
  fields: [
    {
      type: 'row',
      fields: [
        { name: 'project', type: 'relationship', relationTo: 'projects', required: true, index: true },
        { name: 'client', type: 'relationship', relationTo: 'clients' },
      ],
    },
    {
      type: 'row',
      fields: [
        {
          name: 'kind',
          type: 'select',
          required: true,
          defaultValue: 'deposit',
          options: [
            { label: 'Deposit', value: 'deposit' },
            { label: 'Balance', value: 'balance' },
            { label: 'Extra photos', value: 'extras' },
            { label: 'Add-on', value: 'addon' },
          ],
        },
        {
          name: 'status',
          type: 'select',
          required: true,
          defaultValue: 'open',
          index: true,
          options: [
            { label: 'Open (checkout started)', value: 'open' },
            { label: 'Processing (e.g. SEPA)', value: 'processing' },
            { label: 'Paid', value: 'paid' },
            { label: 'Failed', value: 'failed' },
            { label: 'Expired', value: 'expired' },
            { label: 'Partially refunded', value: 'partially_refunded' },
            { label: 'Refunded', value: 'refunded' },
          ],
        },
      ],
    },
    { name: 'label', type: 'text', required: true },
    {
      type: 'row',
      fields: [
        { name: 'amount', type: 'number', required: true, admin: { description: 'In cents' } },
        { name: 'refunded', type: 'number', defaultValue: 0, admin: { description: 'In cents' } },
        { name: 'currency', type: 'text', defaultValue: 'eur' },
      ],
    },
    { name: 'paidAt', type: 'date', admin: { readOnly: true } },
    {
      type: 'collapsible',
      label: 'Stripe',
      admin: { initCollapsed: true },
      fields: [
        { name: 'stripeSessionId', type: 'text', unique: true, index: true, admin: { readOnly: true } },
        { name: 'paymentIntentId', type: 'text', index: true, admin: { readOnly: true } },
        { name: 'checkoutUrl', type: 'text', admin: { readOnly: true } },
        { name: 'livemode', type: 'checkbox', admin: { readOnly: true } },
      ],
    },
  ],
}
