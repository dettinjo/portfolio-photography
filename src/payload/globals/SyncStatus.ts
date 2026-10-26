import type { GlobalConfig } from 'payload'

// Written by the Nextcloud sync (src/lib/sync); read-only in the admin panel.
export const SyncStatus: GlobalConfig = {
  slug: 'sync-status',
  label: 'Nextcloud sync',
  admin: {
    group: 'Portfolio',
    description:
      'Photos are synced from Nextcloud → Lightroom/Portfolio when Nextcloud reports a change and every 15 minutes.',
  },
  access: {
    read: ({ req }) => Boolean(req.user),
    update: () => false,
  },
  fields: [
    { name: 'lastReconcileAt', type: 'date', admin: { readOnly: true, date: { pickerAppearance: 'dayAndTime' } } },
    { name: 'lastWebhookAt', type: 'date', admin: { readOnly: true, date: { pickerAppearance: 'dayAndTime' } } },
    { name: 'lastResult', type: 'text', admin: { readOnly: true } },
    { name: 'errors', type: 'textarea', admin: { readOnly: true } },
  ],
}
