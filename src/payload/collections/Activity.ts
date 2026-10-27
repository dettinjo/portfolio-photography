import type { CollectionConfig } from 'payload'

// Everything that happens on a project, in order: stage changes, invites,
// logins and (later) picks, comments and payments. Entries marked
// clientVisible appear in the client's portal. Written by hooks and routes.
export const Activity: CollectionConfig = {
  slug: 'activity',
  admin: {
    useAsTitle: 'message',
    group: 'Inbox',
    defaultColumns: ['message', 'project', 'actor', 'createdAt'],
  },
  access: {
    read: ({ req }) => Boolean(req.user),
    create: ({ req }) => Boolean(req.user),
    update: ({ req }) => Boolean(req.user),
    delete: ({ req }) => Boolean(req.user),
  },
  defaultSort: '-createdAt',
  fields: [
    { name: 'project', type: 'relationship', relationTo: 'projects', index: true },
    {
      type: 'row',
      fields: [
        {
          name: 'actor',
          type: 'select',
          required: true,
          defaultValue: 'admin',
          options: [
            { label: 'Photographer', value: 'admin' },
            { label: 'Client', value: 'client' },
            { label: 'System', value: 'system' },
          ],
        },
        { name: 'client', type: 'relationship', relationTo: 'clients' },
      ],
    },
    {
      name: 'verb',
      type: 'select',
      required: true,
      defaultValue: 'note',
      options: [
        { label: 'Project created', value: 'project.created' },
        { label: 'Stage changed', value: 'stage.changed' },
        { label: 'Client invited', value: 'client.invited' },
        { label: 'Client signed in', value: 'client.login' },
        { label: 'Folder', value: 'folder' },
        { label: 'Note', value: 'note' },
      ],
    },
    { name: 'message', type: 'text', required: true },
    { name: 'stage', type: 'text', admin: { description: 'New stage, for stage changes' } },
    { name: 'clientVisible', type: 'checkbox', defaultValue: false },
  ],
}
