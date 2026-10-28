import { APIError, type CollectionConfig, type Payload, type PayloadRequest } from 'payload'
import type { Project } from '@/payload-types'
import { STAGES, STAGE_LABELS, isStage, stageIndex } from '../../lib/stages'
import { INVITE_LINK_TTL_MS, issueLoginToken, signInUrl } from '../../lib/client-tokens'
import { sendSignInEmail } from '../../lib/email-client'

// One booking from first contact to archive (docs/REDESIGN.md §7). Clients see
// their projects in the portal at /c/<slug>.

const slugify = (value: string) =>
  value
    .toLowerCase()
    .normalize('NFKD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/ß/g, 'ss')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 60)

async function uniqueSlug(payload: Payload, base: string, req: PayloadRequest) {
  for (let i = 1; ; i++) {
    const slug = i === 1 ? base : `${base}-${i}`
    const hit = await payload.find({ collection: 'projects', where: { slug: { equals: slug } }, limit: 1, depth: 0, req })
    if (!hit.docs.length) return slug
  }
}

const relId = (value: unknown) =>
  typeof value === 'object' && value !== null ? (value as { id: number }).id : (value as number | null | undefined)

async function log(
  payload: Payload,
  req: PayloadRequest,
  data: { project: number; verb: string; message: string; stage?: string; clientVisible?: boolean; actor?: string },
) {
  await payload.create({
    collection: 'activity',
    data: { actor: 'admin', clientVisible: false, ...data } as never,
    req,
    overrideAccess: true,
  })
}

export const Projects: CollectionConfig = {
  slug: 'projects',
  admin: {
    useAsTitle: 'title',
    group: 'Clients',
    defaultColumns: ['title', 'stage', 'shootDate', 'clients', 'updatedAt'],
    listSearchableFields: ['title', 'slug', 'location'],
  },
  access: {
    read: ({ req }) => Boolean(req.user),
    create: ({ req }) => Boolean(req.user),
    update: ({ req }) => Boolean(req.user),
    delete: ({ req }) => Boolean(req.user),
  },
  defaultSort: '-updatedAt',
  hooks: {
    beforeValidate: [
      // Creating a project from an inquiry: take over the client and the details
      async ({ data, operation, req }) => {
        if (operation !== 'create' || !data) return data
        const inquiryId = relId(data.inquiry)
        if (!inquiryId) return data
        const inquiry = await req.payload.findByID({ collection: 'inquiries', id: inquiryId, depth: 1, req }).catch(() => null)
        if (!inquiry) return data

        if (!data.clients?.length) {
          const email = inquiry.email.trim().toLowerCase()
          const existing = await req.payload.find({ collection: 'clients', where: { email: { equals: email } }, limit: 1, depth: 0, req })
          const client =
            existing.docs[0] ??
            (await req.payload.create({
              collection: 'clients',
              data: {
                name: inquiry.name,
                email,
                phone: inquiry.phone,
                locale: inquiry.locale === 'de' ? 'de' : 'en',
              },
              req,
            }))
          data.clients = [client.id]
        }
        const offering = typeof inquiry.offering === 'object' ? inquiry.offering : null
        data.offering ??= offering?.id ?? inquiry.offering ?? undefined
        data.shootDate ??= inquiry.date ?? undefined
        data.location ??= inquiry.location ?? undefined
        data.title ||= [inquiry.name, offering?.title ?? inquiry.kind].filter(Boolean).join(' — ')
        // A first proposal line from the offering's price; edit before sending
        if (offering?.fromPrice && !data.proposal?.lines?.length) {
          data.proposal = { ...data.proposal, lines: [{ label: offering.title, amount: offering.fromPrice }] }
        }
        return data
      },
    ],
    beforeChange: [
      async ({ data, operation, originalDoc, req }) => {
        if (operation === 'create' && !data.slug) {
          const date = data.shootDate ? String(data.shootDate).slice(0, 10) : null
          data.slug = await uniqueSlug(req.payload, [date, slugify(data.title ?? 'project') || 'project'].filter(Boolean).join('-'), req)
        }
        if (operation === 'update' && originalDoc?.stage !== data.stage && data.stage) {
          req.context.stageChange = { from: originalDoc?.stage, to: data.stage }
        }
        if (data.inviteClients) {
          req.context.inviteClients = true
          data.inviteClients = false
        }
        if (data.sendProposal) {
          data.sendProposal = false
          if (!data.proposal?.lines?.length) {
            throw new APIError('Add at least one line to the proposal before sending it.', 400, undefined, true)
          }
          if (!data.clients?.length) throw new APIError('Add a client before sending the proposal.', 400, undefined, true)
          data.proposal = { ...data.proposal, sentAt: new Date().toISOString(), acceptedAt: null, acceptedBy: null }
          if (stageIndex(isStage(data.stage) ? data.stage : 'inquiry') < stageIndex('proposal')) {
            data.stage = 'proposal'
            if (operation === 'update' && originalDoc?.stage !== 'proposal') {
              req.context.stageChange = { from: originalDoc?.stage, to: 'proposal' }
            }
          }
          req.context.sendProposal = true
        }
        if (operation === 'update' && data.billing?.balancePaidAt && !originalDoc?.billing?.balancePaidAt) {
          req.context.balanceSettled = true
        } else if (operation === 'update' && data.billing && !data.billing.balancePaidAt && originalDoc?.billing?.balancePaidAt) {
          req.context.balanceReopened = true
        }
        // Extended into the future: reminders start over, an expired gallery comes back
        const newExpiry = data.delivery?.expiresAt ? new Date(data.delivery.expiresAt).getTime() : null
        const oldExpiry = originalDoc?.delivery?.expiresAt ? new Date(originalDoc.delivery.expiresAt).getTime() : null
        if (operation === 'update' && newExpiry && newExpiry !== oldExpiry && newExpiry > Date.now()) {
          const days = (newExpiry - Date.now()) / 86_400_000
          data.delivery = {
            ...data.delivery,
            ...(days > 30 && { reminder30SentAt: null }),
            ...(days > 7 && { reminder7SentAt: null }),
            ...(data.delivery?.purgedAt && { purgedAt: null }),
          }
          if (originalDoc?.delivery?.purgedAt) data.syncPreviews = true
        }
        // Fetch previews now; a new watermark text means re-rendering them
        if (data.syncPreviews || (operation === 'update' && (data.watermarkText ?? '') !== (originalDoc?.watermarkText ?? ''))) {
          req.context.syncPreviews = true
          data.syncPreviews = false
        }
        return data
      },
    ],
    afterChange: [
      async ({ doc, operation, req }) => {
        const project = doc as Project
        const { payload } = req

        if (operation === 'create') {
          await log(payload, req, { project: project.id, verb: 'project.created', message: `Project created: ${project.title}` })
        }

        const change = req.context.stageChange as { from?: string; to: string } | undefined
        if (change && isStage(change.to)) {
          delete req.context.stageChange
          await log(payload, req, {
            project: project.id,
            verb: 'stage.changed',
            stage: change.to,
            clientVisible: true,
            message: `${isStage(change.from) ? STAGE_LABELS[change.from] : '—'} → ${STAGE_LABELS[change.to]}`,
          })
        }

        if (req.context.inviteClients) {
          delete req.context.inviteClients
          for (const id of (project.clients ?? []).map(relId).filter((v): v is number => typeof v === 'number')) {
            const client = await payload.findByID({ collection: 'clients', id, depth: 0, req, overrideAccess: true })
            const locale = client.locale === 'de' ? 'de' : 'en'
            const token = await issueLoginToken(payload, client.id, INVITE_LINK_TTL_MS, req)
            try {
              await sendSignInEmail({
                to: client.email,
                name: client.name.split(' ')[0],
                locale,
                url: signInUrl(token, locale),
                kind: 'invite',
                projectTitle: project.title,
              })
              await log(payload, req, { project: project.id, verb: 'client.invited', message: `Invitation sent to ${client.email}` })
            } catch (err) {
              payload.logger.error({ err }, `[projects] invitation to ${client.email} failed`)
              await log(payload, req, {
                project: project.id,
                verb: 'client.invited',
                message: `Invitation to ${client.email} FAILED: ${(err as Error).message.slice(0, 200)}`,
              })
            }
          }
        }

        if (req.context.sendProposal) {
          delete req.context.sendProposal
          const { notifyProposal } = await import('../../lib/proposal-mail')
          await notifyProposal(payload, project, req)
        }

        if (req.context.balanceSettled) {
          delete req.context.balanceSettled
          await log(payload, req, { project: project.id, verb: 'note', clientVisible: true, message: 'Balance settled' })
          const { onBalanceSettled } = await import('../../lib/payments')
          await onBalanceSettled(project)
        }

        if (req.context.balanceReopened) {
          delete req.context.balanceReopened
          await log(payload, req, { project: project.id, verb: 'note', message: 'Balance marked as open again' })
        }

        if (req.context.syncPreviews) {
          delete req.context.syncPreviews
          const { scheduleProjectSync } = await import('../../lib/sync/clients')
          scheduleProjectSync(project.id, 1500)
        }

        // Nextcloud folders, until they exist. Runs after the response so a slow
        // or unreachable Nextcloud never blocks saving.
        if (!project.ncFolder && !req.context.skipFolders) {
          setTimeout(() => void createFolders(payload, project), 1500)
        }
        return doc
      },
    ],
  },
  fields: [
    { name: 'title', type: 'text', required: true },
    {
      type: 'row',
      fields: [
        {
          name: 'stage',
          type: 'select',
          required: true,
          defaultValue: 'proposal',
          options: STAGES.map((value) => ({ value, label: STAGE_LABELS[value] })),
        },
        {
          name: 'slug',
          type: 'text',
          unique: true,
          index: true,
          admin: { readOnly: true, description: 'Portal address: /c/<slug>' },
        },
      ],
    },
    { name: 'clients', type: 'relationship', relationTo: 'clients', hasMany: true },
    {
      type: 'row',
      fields: [
        { name: 'inquiry', type: 'relationship', relationTo: 'inquiries', admin: { description: 'Fills client, offering, date and place on create' } },
        { name: 'offering', type: 'relationship', relationTo: 'offerings' },
      ],
    },
    {
      type: 'row',
      fields: [
        { name: 'shootDate', type: 'date', admin: { date: { pickerAppearance: 'dayAndTime' } } },
        { name: 'location', type: 'text' },
      ],
    },
    {
      name: 'nextStep',
      type: 'textarea',
      admin: { description: 'What happens next, shown to the client. Empty: the standard text for the stage.' },
    },
    {
      name: 'keyDates',
      type: 'array',
      admin: { description: 'Further dates for the client, e.g. "Previews ready", "Delivery"' },
      fields: [
        {
          type: 'row',
          fields: [
            { name: 'label', type: 'text', required: true },
            { name: 'date', type: 'date', required: true, admin: { date: { pickerAppearance: 'dayOnly' } } },
          ],
        },
      ],
    },
    {
      name: 'watermarkText',
      type: 'text',
      admin: { description: "Text on preview images. Empty: the client's name." },
    },
    {
      name: 'proposal',
      type: 'group',
      admin: { description: 'What the client accepts in the portal; the deposit is paid by card/SEPA via Stripe.' },
      fields: [
        {
          name: 'lines',
          type: 'array',
          admin: { description: 'Final amounts in € (VAT, if any, is included — see Billing settings).' },
          fields: [
            {
              type: 'row',
              fields: [
                { name: 'label', type: 'text', required: true },
                { name: 'amount', type: 'number', required: true, min: 0 },
              ],
            },
          ],
        },
        { name: 'note', type: 'textarea', admin: { description: 'Shown to the client above the proposal' } },
        {
          type: 'row',
          fields: [
            { name: 'depositPercent', type: 'number', min: 0, max: 100, admin: { description: 'Empty: from the offering (else 30 %)' } },
            { name: 'depositAmount', type: 'number', min: 0, admin: { description: 'Fixed deposit in €; overrides the percentage' } },
          ],
        },
        {
          type: 'row',
          fields: [
            { name: 'sentAt', type: 'date', admin: { readOnly: true } },
            { name: 'acceptedAt', type: 'date', admin: { readOnly: true } },
            { name: 'acceptedBy', type: 'relationship', relationTo: 'clients', admin: { readOnly: true } },
          ],
        },
      ],
    },
    {
      name: 'billing',
      type: 'group',
      label: 'Balance',
      admin: { description: 'The rest after the deposit: proposal total + extra photos − payments. Clients pay it in the portal.' },
      fields: [
        {
          type: 'row',
          fields: [
            {
              name: 'gateDownloads',
              type: 'checkbox',
              defaultValue: true,
              label: 'Downloads wait for the balance',
              admin: { description: 'Clients can view the finals, but download them only once the balance is paid' },
            },
            {
              name: 'balancePaidAt',
              type: 'date',
              admin: { description: 'Paid by bank transfer or cash: set a date to open the downloads. Clear it to undo.' },
            },
          ],
        },
      ],
    },
    { name: 'payments', type: 'join', collection: 'payments', on: 'project' },
    {
      name: 'plan',
      type: 'group',
      admin: { description: 'Planning together: the client answers and adds a shot list and moodboard in the portal.' },
      fields: [
        { name: 'meetingPoint', type: 'text', admin: { description: 'Shown to the client, e.g. "Main entrance, gate B"' } },
        {
          name: 'schedule',
          type: 'array',
          admin: { description: 'The day, shown to the client' },
          fields: [
            {
              type: 'row',
              fields: [
                { name: 'time', type: 'text', required: true, admin: { width: '20%' } },
                { name: 'item', type: 'text', required: true },
              ],
            },
          ],
        },
        {
          name: 'answers',
          type: 'array',
          admin: { description: 'From the client' },
          fields: [
            { name: 'question', type: 'text', required: true },
            { name: 'answer', type: 'textarea' },
          ],
        },
        {
          name: 'shotList',
          type: 'array',
          admin: { description: 'Must-have shots — the client and you can both add to it' },
          fields: [
            {
              type: 'row',
              fields: [
                { name: 'item', type: 'text', required: true },
                { name: 'done', type: 'checkbox', defaultValue: false },
              ],
            },
          ],
        },
        { name: 'updatedByClientAt', type: 'date', admin: { readOnly: true } },
      ],
    },
    { name: 'files', type: 'join', collection: 'project-files', on: 'project' },
    { name: 'messages', type: 'join', collection: 'messages', on: 'project' },
    {
      name: 'proofing',
      type: 'group',
      admin: { description: 'Previews from "1 Preview" in the project folder' },
      fields: [
        {
          type: 'row',
          fields: [
            { name: 'quota', type: 'number', min: 0, admin: { description: 'Photos included. Empty: from the offering' } },
            { name: 'extraPrice', type: 'number', min: 0, admin: { description: '€ per extra photo. Empty: from the offering' } },
            {
              name: 'extras',
              type: 'number',
              min: 0,
              admin: { description: 'Extra photos added to the balance. Set when the selection is sent; lower it to waive them.' },
            },
          ],
        },
        {
          type: 'row',
          fields: [
            { name: 'previewsReadyAt', type: 'date', admin: { readOnly: true, description: 'Clients were told on this date' } },
            {
              name: 'submittedAt',
              type: 'date',
              admin: { description: 'When the selection was sent. Clear it to let the client change their picks again.' },
            },
          ],
        },
      ],
    },
    {
      name: 'delivery',
      type: 'group',
      admin: { description: 'Finals from "2 Final": online for 12 months after delivery, then deleted from the server (they stay in Nextcloud).' },
      fields: [
        {
          type: 'row',
          fields: [
            { name: 'deliveredAt', type: 'date', admin: { readOnly: true } },
            {
              name: 'expiresAt',
              type: 'date',
              admin: { description: 'Move it later to extend the gallery — an expired gallery is restored from Nextcloud.' },
            },
          ],
        },
        {
          type: 'row',
          fields: [
            { name: 'reminder30SentAt', type: 'date', admin: { readOnly: true } },
            { name: 'reminder7SentAt', type: 'date', admin: { readOnly: true } },
            { name: 'purgedAt', type: 'date', admin: { readOnly: true, description: 'Files deleted from the server' } },
            { name: 'reviewRequestedAt', type: 'date', admin: { readOnly: true, description: 'Review invitation sent' } },
          ],
        },
      ],
    },
    {
      name: 'revisionRounds',
      type: 'group',
      label: 'Revisions',
      admin: { description: 'Rounds of changes the client can ask for on delivered photos' },
      fields: [
        {
          type: 'row',
          fields: [
            { name: 'included', type: 'number', min: 0, admin: { description: 'Empty: from the offering (else 1)' } },
            { name: 'used', type: 'number', defaultValue: 0, min: 0, admin: { description: 'Rounds sent so far — lower it to give one back' } },
          ],
        },
      ],
    },
    { name: 'revisions', type: 'join', collection: 'revisions', on: 'project' },
    { name: 'feedback', type: 'join', collection: 'feedback', on: 'project' },
    { name: 'reviews', type: 'join', collection: 'reviews', on: 'project' },
    { name: 'previews', type: 'join', collection: 'photos', on: 'project', admin: { defaultColumns: ['filename', 'purpose', 'status'] } },
    { name: 'picks', type: 'join', collection: 'picks', on: 'project' },
    { name: 'comments', type: 'join', collection: 'comments', on: 'project' },
    { name: 'internalNotes', type: 'textarea', admin: { description: 'Never shown to the client' } },
    {
      name: 'inviteClients',
      type: 'checkbox',
      defaultValue: false,
      admin: { position: 'sidebar', description: 'On save, email every client a sign-in link (valid 7 days)' },
    },
    {
      name: 'sendProposal',
      type: 'checkbox',
      defaultValue: false,
      admin: { position: 'sidebar', description: 'On save, email the proposal to every client (they accept and pay the deposit in the portal)' },
    },
    {
      name: 'syncPreviews',
      type: 'checkbox',
      defaultValue: false,
      admin: { position: 'sidebar', description: 'On save, fetch new previews and finals from Nextcloud now (otherwise every 15 min)' },
    },
    { name: 'ncFolder', label: 'Nextcloud folder', type: 'text', admin: { readOnly: true, position: 'sidebar' } },
    { name: 'ncFolderId', type: 'number', index: true, admin: { readOnly: true, position: 'sidebar' } },
    { name: 'ncFolderError', type: 'text', admin: { readOnly: true, position: 'sidebar', condition: (d) => Boolean(d?.ncFolderError) } },
  ],
}

async function createFolders(payload: Payload, project: Project) {
  const { ensureProjectFolders } = await import('../../lib/project-folders')
  let data: Partial<Project>
  try {
    data = { ncFolder: await ensureProjectFolders(project.slug ?? String(project.id), project.shootDate), ncFolderError: null }
  } catch (err) {
    data = { ncFolderError: (err as Error).message.slice(0, 300) }
  }
  if (data.ncFolderError === project.ncFolderError && !data.ncFolder) return
  await payload
    .update({ collection: 'projects', id: project.id, data, context: { skipFolders: true }, overrideAccess: true })
    .catch((err) => payload.logger.error({ err }, '[projects] could not store folder state'))
  // The folder may already hold photos (created by hand, or a sync request came in before it existed)
  if (data.ncFolder) {
    const { scheduleProjectSync } = await import('../../lib/sync/clients')
    scheduleProjectSync(project.id, 2000)
  }
}
