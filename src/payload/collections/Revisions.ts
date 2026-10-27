import type { CollectionConfig } from 'payload'

// Change requests on delivered photos. The client collects them (draft) and
// sends them as one round; a re-export of the photo marks them done; the client
// then approves or asks again (next round, while rounds are left).
export const Revisions: CollectionConfig = {
  slug: 'revisions',
  labels: { singular: 'Change request', plural: 'Change requests' },
  admin: {
    useAsTitle: 'body',
    group: 'Inbox',
    defaultColumns: ['body', 'photo', 'status', 'round', 'project', 'updatedAt'],
    description: 'Set a request to "Done" by hand if no new export is needed.',
  },
  access: {
    read: ({ req }) => Boolean(req.user),
    create: ({ req }) => Boolean(req.user),
    update: ({ req }) => Boolean(req.user),
    delete: ({ req }) => Boolean(req.user),
  },
  defaultSort: '-updatedAt',
  hooks: {
    afterChange: [
      async ({ doc, previousDoc, operation, req }) => {
        // Last open request of a round done (by a re-export or by hand) → tell the clients
        if (operation !== 'update' || previousDoc?.status !== 'requested' || doc.status !== 'done') return doc
        const projectId = typeof doc.project === 'object' ? doc.project.id : doc.project
        const open = await req.payload.count({
          collection: 'revisions',
          where: { and: [{ project: { equals: projectId } }, { status: { equals: 'requested' } }] },
          req,
          overrideAccess: true,
        })
        if (open.totalDocs) return doc
        const { notifyRevisionsReady } = await import('../../lib/revisions')
        await notifyRevisionsReady(req.payload, projectId, doc.round).catch((err) => req.payload.logger.error({ err }, '[revisions] notify failed'))
        return doc
      },
    ],
  },
  fields: [
    {
      type: 'row',
      fields: [
        { name: 'project', type: 'relationship', relationTo: 'projects', required: true, index: true },
        { name: 'photo', type: 'relationship', relationTo: 'photos', required: true, index: true },
        { name: 'client', type: 'relationship', relationTo: 'clients' },
      ],
    },
    { name: 'body', type: 'textarea', required: true },
    {
      type: 'row',
      fields: [
        {
          name: 'status',
          type: 'select',
          required: true,
          defaultValue: 'draft',
          index: true,
          options: [
            { label: 'Draft (not sent yet)', value: 'draft' },
            { label: 'Requested', value: 'requested' },
            { label: 'Done — waiting for the client', value: 'done' },
            { label: 'Approved', value: 'approved' },
            { label: 'Not right yet (asked again)', value: 'changes' },
          ],
        },
        { name: 'round', type: 'number', required: true, defaultValue: 1 },
        { name: 'x', type: 'number', min: 0, max: 1 },
        { name: 'y', type: 'number', min: 0, max: 1 },
      ],
    },
    {
      type: 'row',
      fields: [
        { name: 'versionRequested', type: 'text', admin: { readOnly: true, description: 'Photo version the request refers to' } },
        { name: 'requestedAt', type: 'date', admin: { readOnly: true } },
        { name: 'doneAt', type: 'date', admin: { readOnly: true } },
        { name: 'reviewedAt', type: 'date', admin: { readOnly: true } },
      ],
    },
  ],
}
