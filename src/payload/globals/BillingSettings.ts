import type { GlobalConfig } from 'payload'

// How prices are labelled for tax (decision D6: no VAT by default). Prices in
// proposals are always final amounts; this only changes the note under them.
export const BillingSettings: GlobalConfig = {
  slug: 'billing-settings',
  label: 'Billing',
  admin: { group: 'Clients' },
  access: {
    read: ({ req }) => Boolean(req.user),
    update: ({ req }) => Boolean(req.user),
  },
  fields: [
    {
      name: 'taxMode',
      type: 'select',
      required: true,
      defaultValue: 'none',
      options: [
        { label: 'No VAT — "all prices are final amounts"', value: 'none' },
        { label: 'Small business (§ 19 UStG) — no VAT, with the legal note', value: 'smallBusiness' },
        { label: 'VAT included — shows the VAT share', value: 'vat' },
      ],
      admin: { description: 'Only the note under proposals changes; amounts are always final.' },
    },
    {
      name: 'vatRate',
      type: 'number',
      min: 0,
      max: 50,
      defaultValue: 19,
      admin: { condition: (data) => data?.taxMode === 'vat', description: 'Percent, included in the prices' },
    },
  ],
}
