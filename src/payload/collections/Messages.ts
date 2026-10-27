import type { CollectionConfig } from 'payload'

// One conversation per project. Clients write in the portal; you answer here
// (leave "client" empty) and the clients get an email with a link to the thread.
export const Messages: CollectionConfig = {
  slug: 'messages',
  admin: {
    useAsTitle: 'body',
    group: 'Inbox',
    defaultColumns: ['body', 'project', 'client', 'createdAt'],
    description: 'To answer a client, create a message with the project and leave "client" empty.',
  },
  access: {
    read: ({ req }) => Boolean(req.user),
    create: ({ req }) => Boolean(req.user),
    update: ({ req }) => Boolean(req.user),
    delete: ({ req }) => Boolean(req.user),
  },
  defaultSort: '-createdAt',
  hooks: {
    afterChange: [
      async ({ doc, operation, req }) => {
        // Your reply → email the project's clients
        if (operation !== 'create' || doc.client || req.context.fromPortal) return doc
        const { notifyClientsOfReply } = await import('../../lib/messages')
        await notifyClientsOfReply(req.payload, doc).catch((err) => req.payload.logger.error({ err }, '[messages] notify failed'))
        return doc
      },
    ],
  },
  fields: [
    { name: 'project', type: 'relationship', relationTo: 'projects', required: true, index: true },
    { name: 'client', type: 'relationship', relationTo: 'clients', admin: { description: 'Empty: written by you' } },
    { name: 'body', type: 'textarea', required: true },
  ],
}
