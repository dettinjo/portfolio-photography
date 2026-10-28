// TEMPORARY demo data for trying every feature on the live site (requested
// 2026-10-28). Everything created here is marked (DEMO) and removed again by
// removeDemo(): clients, projects across all stages, previews and finals made
// from the portfolio photos (no Nextcloud involved), picks, notes, messages,
// payments (recorded by hand, no Stripe), revisions, feedback, a review, guest
// links and two inquiries. Creating it sends no emails; demo clients get
// plus-addresses of the admin email, so mails sent while testing reach you.
// Delete this file, /api/studio/demo and the studio panel when done.
import 'server-only'
import { readdir, readFile } from 'fs/promises'
import path from 'path'
import sharp from 'sharp'
import type { Payload } from 'payload'
import type { Client, Photo, Project } from '@/payload-types'
import { findPhotoDir, processPhoto, removeAllVersions } from '@/lib/sync/process'
import { watermarkLabel } from '@/lib/sync/clients'
import { newToken } from '@/lib/share'
import { ADMIN_TO } from '@/lib/mailer'

export const DEMO_MARK = 'DEMO DATA — remove it in /studio'
const FILE_ID_BASE = 1_900_000_000
const DAY = 86_400_000
const all = { limit: 0, pagination: false, depth: 0, overrideAccess: true } as const
const quiet = { overrideAccess: true, context: { skipFolders: true, fromPortal: true } } as const

const at = (days: number) => new Date(Date.now() + days * DAY).toISOString()
const dateOnly = (days: number) => `${at(days).slice(0, 10)}T00:00:00.000Z`

/** admin@x.de → admin+demo-anna@x.de, so test emails reach the photographer. */
export function demoEmail(key: string) {
  const [local, domain] = ADMIN_TO.split('@')
  return `${local}+demo-${key}@${domain}`
}

export async function demoState(payload: Payload) {
  const clients = await payload.find({ collection: 'clients', where: { notes: { equals: DEMO_MARK } }, sort: 'name', ...all })
  const projects = await payload.find({ collection: 'projects', where: { internalNotes: { equals: DEMO_MARK } }, sort: 'title', ...all })
  return {
    clients: clients.docs.map((c) => ({ id: c.id, name: c.name, locale: c.locale ?? 'en' })),
    projects: projects.docs.map((p) => ({ id: p.id, title: p.title, slug: p.slug ?? '', stage: p.stage })),
  }
}

// ── Images ────────────────────────────────────────────────────────────────

/** JPEG buffers made from the largest stored size of each portfolio photo. */
async function sourceImages(payload: Payload, count: number): Promise<{ name: string; buffer: Buffer }[]> {
  const photos = await payload.find({
    collection: 'photos',
    where: { and: [{ status: { equals: 'ready' } }, { or: [{ purpose: { equals: 'portfolio' } }, { purpose: { exists: false } }] }] },
    sort: 'order',
    limit: 60,
    depth: 0,
    overrideAccess: true,
  })
  const out: { name: string; buffer: Buffer }[] = []
  for (const p of photos.docs) {
    if (out.length >= count) break
    const dir = p.version ? findPhotoDir(p.ncFileId, p.version, 'photos') : null
    if (!dir) continue
    const largest = (await readdir(dir).catch(() => [] as string[]))
      .filter((f) => f.endsWith('.webp'))
      .sort((a, b) => Number(b.slice(0, -5)) - Number(a.slice(0, -5)))[0]
    if (!largest) continue
    const buffer = await sharp(await readFile(path.join(dir, largest))).jpeg({ quality: 90 }).toBuffer()
    out.push({ name: `DEMO_${String(out.length + 1).padStart(4, '0')}.jpg`, buffer })
  }
  if (!out.length) throw new Error('No portfolio photos found to build demo images from')
  return out
}

let nextFileId = FILE_ID_BASE

async function addImage(
  payload: Payload,
  project: Project,
  purpose: 'preview' | 'final',
  src: { name: string; buffer: Buffer },
  order: number,
  label: string | null,
  withBefore = false,
): Promise<Photo> {
  const fileId = nextFileId++
  const kind = purpose === 'preview' ? 'previews' : 'finals'
  let previousVersion: string | null = null
  if (withBefore) {
    // An "earlier export" for the before/after slider: flatter and cooler
    const before = await sharp(src.buffer).modulate({ saturation: 0.55, brightness: 0.93 }).tint({ r: 225, g: 232, b: 255 }).jpeg({ quality: 88 }).toBuffer()
    await processPhoto(before, fileId, 'demo0', { kind, originalName: src.name })
    previousVersion = 'demo0'
  }
  const result = await processPhoto(src.buffer, fileId, 'demo1', { kind, watermark: label, originalName: src.name })
  return payload.create({
    collection: 'photos',
    data: {
      purpose,
      project: project.id,
      visibility: 'hidden',
      filename: src.name,
      ncFileId: fileId,
      ncPath: `demo/${project.slug}/${src.name}`,
      status: 'ready',
      order,
      version: 'demo1',
      previousVersion,
      ...(withBefore && { revisedAt: at(-1) }),
      watermark: label,
      bytes: src.buffer.length,
      width: result.width,
      height: result.height,
      widths: result.widths,
      placeholder: result.placeholder,
      color: result.color,
    },
    overrideAccess: true,
  })
}

// ── Seed ──────────────────────────────────────────────────────────────────

export async function seedDemo(payload: Payload): Promise<{ projects: number; photos: number }> {
  const existing = await demoState(payload)
  if (existing.projects.length || existing.clients.length) throw new Error('Demo data exists already — remove it first')

  const highest = await payload.find({ collection: 'photos', where: { ncFileId: { greater_than_equal: FILE_ID_BASE } }, sort: '-ncFileId', limit: 1, depth: 0, overrideAccess: true })
  nextFileId = Math.max(FILE_ID_BASE, (highest.docs[0]?.ncFileId ?? FILE_ID_BASE - 1) + 1)

  const offerings = await payload.find({ collection: 'offerings', ...all })
  const offering = (slug: string) => offerings.docs.find((o) => o.slug === slug)?.id
  const images = await sourceImages(payload, 26)
  const img = (i: number) => images[i % images.length]

  const client = (key: string, name: string, locale: 'en' | 'de', phone?: string) =>
    payload.create({ collection: 'clients', data: { name, email: demoEmail(key), locale, phone, notes: DEMO_MARK }, overrideAccess: true })
  const anna = await client('anna', 'Anna Müller', 'de', '+49 170 0000001')
  const max = await client('max', 'Max Fischer', 'en')
  const ben = await client('ben', 'Ben Weber', 'de')
  const clara = await client('clara', 'Clara Weber', 'de')

  const project = (data: Partial<Project>) =>
    payload.create({ collection: 'projects', data: { internalNotes: DEMO_MARK, ...data } as Project, ...quiet })
  const note = (p: Project, message: string, extra: Record<string, unknown> = {}) =>
    payload.create({ collection: 'activity', data: { project: p.id, actor: 'system', verb: 'note', clientVisible: true, message, ...extra } as never, overrideAccess: true })
  const booked = (p: Project, daysAgo: number) =>
    note(p, 'Proposal → Booked', { verb: 'stage.changed', stage: 'booked' }).then((a) =>
      payload.update({ collection: 'activity', id: a.id, data: { createdAt: at(-daysAgo) } as never, overrideAccess: true }),
    )
  const pay = (p: Project, c: Client, kind: 'deposit' | 'balance', euros: number, daysAgo: number) =>
    payload.create({
      collection: 'payments',
      data: { project: p.id, client: c.id, kind, label: `${kind === 'deposit' ? 'Deposit' : 'Balance'} — ${p.title}`, amount: euros * 100, currency: 'eur', status: 'paid', paidAt: at(-daysAgo) },
      overrideAccess: true,
    })
  const message = (p: Project, from: Client | null, body: string) =>
    payload.create({ collection: 'messages', data: { project: p.id, client: from?.id, body }, ...quiet })
  let photos = 0

  // 1 — Proposal sent, waiting for the client
  const p1 = await project({
    title: 'Demo · Max Fischer — Portraits',
    clients: [max.id],
    offering: offering('portraits'),
    stage: 'proposal',
    shootDate: dateOnly(24),
    location: 'Mannheim, Luisenpark',
    proposal: {
      lines: [
        { label: 'Portrait session, 1 hour', amount: 190 },
        { label: 'Second outfit', amount: 40 },
      ],
      note: 'Hi Max — here is the plan we talked about. Accept it below and the date is yours.',
      sentAt: at(-1),
    },
  })
  await note(p1, 'Proposal sent')

  // 2 — Booked and planning: plan, shot list, messages (one waiting for you)
  const p2 = await project({
    title: 'Demo · Anna Müller — Race day',
    clients: [anna.id],
    offering: offering('events-motorsport'),
    stage: 'planning',
    shootDate: dateOnly(38),
    location: 'Hockenheimring',
    keyDates: [{ label: 'Previews ready', date: dateOnly(41) }],
    proposal: { lines: [{ label: 'Race day coverage, 3 hours', amount: 450 }], sentAt: at(-9), acceptedAt: at(-8), acceptedBy: anna.id },
    plan: {
      meetingPoint: 'Paddock entrance, gate 4',
      schedule: [
        { time: '08:00', item: 'Meet at the paddock' },
        { time: '09:30', item: 'Qualifying' },
        { time: '13:00', item: 'Race' },
      ],
      answers: [
        { question: 'What is the occasion?', answer: 'My first season in the GT cup — I want photos of the car and the team.' },
        { question: 'Anything I should know?', answer: 'Car #27, blue and white. My dad will be in the pit lane.' },
      ],
      shotList: [
        { item: 'Car on the starting grid', done: false },
        { item: 'Team portrait in front of the garage', done: false },
        { item: 'Podium (fingers crossed!)', done: false },
      ],
      updatedByClientAt: at(-2),
    },
  })
  await booked(p2, 8)
  await pay(p2, anna, 'deposit', 135, 8)
  await message(p2, null, 'Hi Anna, thanks for booking! I added the meeting point and a rough schedule under "Plan".')
  await message(p2, anna, 'Perfect, thank you! Could we also get a photo with my dad in the pit lane?')
  await payload.create({ collection: 'feedback', data: { project: p2.id, client: anna.id, moment: 'booking', rating: 5, comment: 'Booking was super easy.' }, overrideAccess: true })

  // 3 — Couple picking their favourites (two pickers, quota exceeded, notes)
  const p3 = await project({
    title: 'Demo · Ben & Clara — Wedding',
    clients: [ben.id, clara.id],
    offering: offering('weddings'),
    stage: 'proofing',
    shootDate: dateOnly(-12),
    location: 'Heidelberg, Schloss',
    proposal: { lines: [{ label: 'Wedding, full day', amount: 2400 }], sentAt: at(-90), acceptedAt: at(-88), acceptedBy: ben.id },
    proofing: { quota: 8, extraPrice: 25, previewsReadyAt: at(-2) },
  })
  await booked(p3, 88)
  await pay(p3, ben, 'deposit', 720, 88)
  const label3 = watermarkLabel(p3, [ben])
  const previews: Photo[] = []
  for (let i = 0; i < 12; i++) previews.push(await addImage(payload, p3, 'preview', img(i), i, label3))
  photos += previews.length
  for (const i of [0, 1, 2, 3, 4, 5]) await payload.create({ collection: 'picks', data: { project: p3.id, photo: previews[i].id, client: ben.id }, overrideAccess: true })
  for (const i of [3, 4, 5, 6, 7, 8]) await payload.create({ collection: 'picks', data: { project: p3.id, photo: previews[i].id, client: clara.id }, overrideAccess: true })
  await payload.create({ collection: 'comments', data: { project: p3.id, photo: previews[1].id, client: clara.id, body: 'Could this one be a little brighter?', x: 0.42, y: 0.38 }, overrideAccess: true })
  await payload.create({ collection: 'comments', data: { project: p3.id, photo: previews[1].id, body: 'Sure — I will lift the shadows a bit.' }, overrideAccess: true })
  await payload.create({ collection: 'comments', data: { project: p3.id, photo: previews[4].id, client: ben.id, body: 'Our favourite!' }, overrideAccess: true })
  await note(p3, '12 previews ready')
  await payload.create({ collection: 'feedback', data: { project: p3.id, client: clara.id, moment: 'sneak-peek', rating: 4, comment: 'Love the sneak peek, can’t wait for the rest.' }, overrideAccess: true })

  // 4 — Delivered, balance still open (downloads locked), a revision done, a guest link
  const p4 = await project({
    title: 'Demo · Anna Müller — Track day',
    clients: [anna.id],
    offering: offering('events-motorsport'),
    stage: 'delivery',
    shootDate: dateOnly(-30),
    location: 'Nürburgring',
    proposal: { lines: [{ label: 'Track day coverage', amount: 900 }], sentAt: at(-60), acceptedAt: at(-58), acceptedBy: anna.id },
    proofing: { extraPrice: 6, extras: 2, submittedAt: at(-20) },
    delivery: { deliveredAt: at(-3), expiresAt: at(362), reviewRequestedAt: at(-3) },
    revisionRounds: { included: 2, used: 1 },
  })
  await booked(p4, 58)
  await pay(p4, anna, 'deposit', 270, 58)
  const finals4: Photo[] = []
  for (let i = 0; i < 8; i++) finals4.push(await addImage(payload, p4, 'final', img(12 + i), i, null, i === 0))
  photos += finals4.length
  await payload.create({
    collection: 'revisions',
    data: { project: p4.id, photo: finals4[0].id, client: anna.id, body: 'Please make the sky a bit warmer.', x: 0.5, y: 0.2, status: 'done', round: 1, versionRequested: 'demo0', requestedAt: at(-2), doneAt: at(-1) },
    overrideAccess: true,
  })
  await note(p4, 'Selection sent: 10 photos (2 extra)')
  await note(p4, '8 final photos delivered')
  await payload.create({ collection: 'share-links', data: { project: p4.id, createdBy: anna.id, label: 'Family', token: newToken(), downloads: false, views: 3, lastViewedAt: at(-1) }, overrideAccess: true })

  // 5 — Finished: paid in full, review waiting for approval, publication consent
  const p5 = await project({
    title: 'Demo · Max Fischer — Company event',
    clients: [max.id],
    offering: offering('events-motorsport'),
    stage: 'feedback',
    shootDate: dateOnly(-55),
    location: 'Frankfurt, Messe',
    proposal: { lines: [{ label: 'Event coverage, 2 hours', amount: 600 }], sentAt: at(-100), acceptedAt: at(-99), acceptedBy: max.id },
    delivery: { deliveredAt: at(-21), expiresAt: at(344), reviewRequestedAt: at(-14) },
  })
  await booked(p5, 99)
  await pay(p5, max, 'deposit', 180, 99)
  await pay(p5, max, 'balance', 420, 25)
  const finals5: Photo[] = []
  for (let i = 0; i < 6; i++) finals5.push(await addImage(payload, p5, 'final', img(20 + i), i, null))
  photos += finals5.length
  for (const [i, consent] of [[0, 'yes'], [1, 'yes'], [2, 'no']] as const) {
    await payload.update({ collection: 'photos', id: finals5[i].id, data: { publishConsent: consent, consentBy: max.id, consentAt: at(-10) }, overrideAccess: true })
  }
  await payload.create({
    collection: 'reviews',
    data: {
      project: p5.id,
      client: max.id,
      favouritePhoto: finals5[1].id,
      name: 'Max F.',
      role: 'Company event',
      quote: 'Relaxed, quick and the photos were ready within a week. Our team loved them.',
      communication: 5,
      creativity: 5,
      professionalism: 5,
      value: 4,
      approved: false,
    },
    overrideAccess: true,
  })
  await payload.create({ collection: 'feedback', data: { project: p5.id, client: max.id, moment: 'booking', rating: 5 }, overrideAccess: true })
  await payload.create({ collection: 'share-links', data: { project: p5.id, createdBy: max.id, label: 'Team', token: newToken(), downloads: true, views: 7, lastViewedAt: at(-4) }, overrideAccess: true })
  await message(p5, max, 'Thanks again — the team is thrilled!')
  await message(p5, null, 'So glad to hear that, Max!')

  // Two new inquiries for the inbox ("Create project")
  const portraits = offering('portraits')
  const weddings = offering('weddings')
  await payload.create({
    collection: 'inquiries',
    data: { status: 'new', locale: 'de', offering: portraits, date: dateOnly(16), location: 'Mainz', size: 'small', name: 'Lena Schmidt', email: demoEmail('lena'), message: 'Hallo! Ich hätte gern neue Bewerbungsfotos, gern draußen.', notes: DEMO_MARK },
    overrideAccess: true,
  })
  await payload.create({
    collection: 'inquiries',
    data: { status: 'new', locale: 'en', offering: weddings, dateFlexible: true, location: 'Lake Constance', size: 'large', name: 'Tom Becker', email: demoEmail('tom'), message: 'We are getting married next summer and love your candid style.', notes: DEMO_MARK },
    overrideAccess: true,
  })

  return { projects: 5, photos }
}

// ── Remove ────────────────────────────────────────────────────────────────

export async function removeDemo(payload: Payload): Promise<{ projects: number; photos: number; clients: number }> {
  const inquiries = await payload.find({ collection: 'inquiries', where: { or: [{ notes: { equals: DEMO_MARK } }, { email: { contains: '+demo-' } }] }, ...all })
  const clients = await payload.find({ collection: 'clients', where: { or: [{ notes: { equals: DEMO_MARK } }, { email: { contains: '+demo-' } }] }, ...all })
  const clientIds = clients.docs.map((c) => c.id)
  const inquiryIds = inquiries.docs.map((i) => i.id)
  // Demo projects, plus any made while testing (from a demo inquiry or for a demo client)
  const projects = await payload.find({
    collection: 'projects',
    where: {
      or: [
        { internalNotes: { equals: DEMO_MARK } },
        ...(inquiryIds.length ? [{ inquiry: { in: inquiryIds } }] : []),
        ...(clientIds.length ? [{ clients: { in: clientIds } }] : []),
      ],
    },
    ...all,
  })
  const ids = projects.docs.map((p) => p.id)
  let photos = 0
  if (ids.length) {
    const byProject = { project: { in: ids } }
    const images = await payload.find({ collection: 'photos', where: byProject, ...all })
    for (const p of images.docs) {
      await removeAllVersions(p.ncFileId, p.purpose === 'final' ? 'finals' : 'previews')
    }
    photos = images.docs.length
    for (const collection of ['picks', 'comments', 'revisions', 'messages', 'payments', 'feedback', 'reviews', 'share-links', 'activity', 'project-files'] as const) {
      await payload.delete({ collection, where: byProject, overrideAccess: true })
    }
    await payload.delete({ collection: 'photos', where: byProject, overrideAccess: true })
    await payload.delete({ collection: 'projects', where: { id: { in: ids } }, overrideAccess: true, context: { skipFolders: true } })
  }
  if (clientIds.length) {
    await payload.delete({ collection: 'push-subscriptions', where: { client: { in: clientIds } }, overrideAccess: true })
    await payload.delete({ collection: 'reviews', where: { client: { in: clientIds } }, overrideAccess: true })
    await payload.delete({ collection: 'clients', where: { id: { in: clientIds } }, overrideAccess: true })
  }
  if (inquiryIds.length) await payload.delete({ collection: 'inquiries', where: { id: { in: inquiryIds } }, overrideAccess: true })
  return { projects: ids.length, photos, clients: clientIds.length }
}
