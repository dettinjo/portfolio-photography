import type { CollectionConfig } from 'payload'
import { v4 as uuidv4 } from 'uuid'
import { sendApprovalEmail, sendSelectionsNotification } from '../../lib/email-payload'

export const Albums: CollectionConfig = {
  slug: 'albums',
  admin: {
    useAsTitle: 'title',
    defaultColumns: ['title', 'slug', 'clientName', 'approvalStatus', 'updatedAt'],
    description: 'Each album must have a slug matching the Nextcloud folder name under Lightroom/Portfolio/',
  },
  access: {
    // Public read is intentionally unrestricted — the approval token acts as the secret.
    // The custom by-token endpoint only exposes fields needed for the approval UI.
    read: () => true,
    create: ({ req }) => Boolean(req.user),
    update: ({ req }) => Boolean(req.user),
    delete: ({ req }) => Boolean(req.user),
  },
  hooks: {
    beforeValidate: [
      ({ data }) => {
        if (data && !data.approvalToken) {
          data.approvalToken = uuidv4()
        }
        return data
      },
    ],
    afterChange: [
      async ({ doc, previousDoc, operation }) => {
        // Send approval email when clientEmail is set and status flips to 'notified'
        if (
          operation === 'update' &&
          doc.approvalStatus === 'notified' &&
          previousDoc?.approvalStatus !== 'notified' &&
          doc.clientEmail &&
          doc.approvalToken
        ) {
          await sendApprovalEmail({
            to: doc.clientEmail,
            clientName: doc.clientName ?? '',
            albumTitle: doc.title ?? doc.slug,
            approvalToken: doc.approvalToken,
          }).catch((err: Error) => console.error('[albums] failed to send approval email:', err))
        }
        // Notify admin when client submits their selection
        if (
          doc.approvalStatus === 'submitted' &&
          previousDoc?.approvalStatus !== 'submitted'
        ) {
          await sendSelectionsNotification({
            albumTitle: doc.title ?? doc.slug,
            albumSlug: doc.slug,
            clientName: doc.clientName,
            clientEmail: doc.clientEmail,
            selectedCount: (doc.selections ?? []).length,
          }).catch((err: Error) => console.error('[albums] failed to send selections notification:', err))
        }
        return doc
      },
    ],
  },
  fields: [
    {
      name: 'slug',
      type: 'text',
      required: true,
      unique: true,
      admin: { description: 'Must exactly match the Nextcloud folder name, e.g. "wedding-mueller"' },
    },
    { name: 'title', type: 'text', required: true },
    { name: 'clientName', type: 'text' },
    { name: 'clientEmail', type: 'email' },
    {
      name: 'approvalToken',
      type: 'text',
      unique: true,
      admin: {
        readOnly: true,
        description: 'Auto-generated. Share /approve/<token> with the client.',
      },
    },
    {
      name: 'approvalStatus',
      type: 'select',
      defaultValue: 'pending',
      options: [
        { label: 'Pending (not sent)', value: 'pending' },
        { label: 'Notified (email sent)', value: 'notified' },
        { label: 'Submitted (client done)', value: 'submitted' },
        { label: 'Approved (finalized)', value: 'approved' },
      ],
      admin: { description: 'Set to "Notified" to trigger the approval email to the client.' },
    },
    {
      name: 'selections',
      type: 'array',
      admin: { description: 'Filled in by the client via the approval link.' },
      fields: [
        { name: 'filename', type: 'text', required: true },
        { name: 'comment', type: 'textarea' },
      ],
    },
    { name: 'selectionMin', type: 'number', admin: { description: 'Minimum images client must select (0 = no minimum).' } },
    { name: 'selectionMax', type: 'number', admin: { description: 'Maximum images client may select (0 = no limit).' } },
    { name: 'allowDownloads', type: 'checkbox', defaultValue: false },
    {
      name: 'approvalTerms',
      type: 'textarea',
      admin: { description: 'Optional terms shown above the submit button on the approval page.' },
    },
    {
      name: 'published',
      type: 'checkbox',
      defaultValue: false,
      admin: { description: 'Show this album in the public portfolio grid.' },
    },
  ],
}
