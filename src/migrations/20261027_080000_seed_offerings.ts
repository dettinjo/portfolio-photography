// Data only: the launch offerings and add-ons (decision D1 in docs/REDESIGN.md).
// Idempotent — existing offerings (by slug) and existing add-ons are left alone,
// so edits made in the admin panel are never overwritten.
import type { MigrateUpArgs, MigrateDownArgs } from '@payloadcms/db-postgres'

type Text = { en: string; de: string }

const OFFERINGS: Array<{
  slug: string
  genre: string
  order: number
  title: Text
  tagline: Text
  includes: Text
  duration: Text
  fromPrice: number | null
  depositPercent: number
  imageQuota: number | null
  extraImagePrice: number | null
  revisionRounds: number
  deliveryDays: number | null
}> = [
  {
    slug: 'portraits',
    genre: 'portraits',
    order: 1,
    title: { en: 'Portraits', de: 'Porträts' },
    tagline: { en: 'For people, couples and personal branding.', de: 'Für Menschen, Paare und Personal Branding.' },
    includes: {
      en: '1 hour, 1 location\nA short call beforehand\nAll previews to choose from\n10 edited photos',
      de: '1 Stunde, 1 Location\nEin kurzes Gespräch vorab\nAlle Vorschauen zur Auswahl\n10 bearbeitete Fotos',
    },
    duration: { en: '1 h', de: '1 Std.' },
    fromPrice: 120,
    depositPercent: 30,
    imageQuota: 10,
    extraImagePrice: 8,
    revisionRounds: 1,
    deliveryDays: 7,
  },
  {
    slug: 'events-motorsport',
    genre: 'events-motorsport',
    order: 2,
    title: { en: 'Events & Motorsport', de: 'Events & Motorsport' },
    tagline: { en: 'For live events, race days and corporate events.', de: 'Für Live-Events, Renntage und Firmenevents.' },
    includes: {
      en: 'Up to 3 hours of coverage\nSneak peek: 10 photos within 48 hours\n30 edited photos',
      de: 'Bis zu 3 Stunden Begleitung\nSneak Peek: 10 Fotos innerhalb von 48 Stunden\n30 bearbeitete Fotos',
    },
    duration: { en: 'up to 3 h', de: 'bis 3 Std.' },
    fromPrice: 290,
    depositPercent: 30,
    imageQuota: 30,
    extraImagePrice: 6,
    revisionRounds: 1,
    deliveryDays: 7,
  },
  {
    slug: 'cars-brands',
    genre: 'cars-brands',
    order: 3,
    title: { en: 'Cars & Brands', de: 'Autos & Marken' },
    tagline: { en: 'For cars, products and brand content.', de: 'Für Autos, Produkte und Markeninhalte.' },
    includes: {
      en: 'Up to 3 hours, up to 2 locations\n30 photos with detailed retouching\nUsage licence for web & social media',
      de: 'Bis zu 3 Stunden, bis zu 2 Locations\n30 Fotos mit detaillierter Retusche\nNutzungslizenz für Web & Social Media',
    },
    duration: { en: 'up to 3 h', de: 'bis 3 Std.' },
    fromPrice: 380,
    depositPercent: 50,
    imageQuota: 30,
    extraImagePrice: 12,
    revisionRounds: 2,
    deliveryDays: 10,
  },
  {
    // Hidden until a wedding series is published; price on request until then
    slug: 'weddings',
    genre: 'weddings',
    order: 4,
    title: { en: 'Weddings', de: 'Hochzeiten' },
    tagline: { en: 'For your day, from getting ready to the dance floor.', de: 'Für euren Tag, vom Getting Ready bis zur Tanzfläche.' },
    includes: { en: 'Coverage tailored to your day', de: 'Begleitung passend zu eurem Tag' },
    duration: { en: 'by arrangement', de: 'nach Absprache' },
    fromPrice: null,
    depositPercent: 30,
    imageQuota: null,
    extraImagePrice: null,
    revisionRounds: 1,
    deliveryDays: null,
  },
]

const ADD_ONS: Array<{ label: Text; price: Text }> = [
  { label: { en: 'Express delivery within 48 hours', de: 'Express-Lieferung innerhalb von 48 Stunden' }, price: { en: '+20 %', de: '+20 %' } },
  { label: { en: 'Extra hour', de: 'Zusätzliche Stunde' }, price: { en: '€55 / h', de: '55 € / Std.' } },
  { label: { en: 'Travel', de: 'Anfahrt' }, price: { en: '€0.50 / km', de: '0,50 € / km' } },
]

const PRICE_NOTE: Text = { en: 'All prices are final amounts.', de: 'Alle Preise sind Endpreise.' }

export async function up({ payload }: MigrateUpArgs): Promise<void> {
  for (const o of OFFERINGS) {
    const exists = await payload.find({ collection: 'offerings', where: { slug: { equals: o.slug } }, limit: 1, depth: 0 })
    if (exists.docs.length) continue
    const genre = await payload.find({ collection: 'genres', where: { slug: { equals: o.genre } }, limit: 1, depth: 0 })
    if (!genre.docs[0]) continue
    const created = await payload.create({
      collection: 'offerings',
      locale: 'en',
      data: {
        slug: o.slug,
        genre: genre.docs[0].id,
        order: o.order,
        title: o.title.en,
        tagline: o.tagline.en,
        includes: o.includes.en,
        duration: o.duration.en,
        fromPrice: o.fromPrice,
        depositPercent: o.depositPercent,
        imageQuota: o.imageQuota,
        extraImagePrice: o.extraImagePrice,
        revisionRounds: o.revisionRounds,
        deliveryDays: o.deliveryDays,
      },
    })
    await payload.update({
      collection: 'offerings',
      id: created.id,
      locale: 'de',
      data: { title: o.title.de, tagline: o.tagline.de, includes: o.includes.de, duration: o.duration.de },
    })
  }

  const settings = await payload.findGlobal({ slug: 'sessions-settings', locale: 'en', depth: 0 })
  if (!settings.addOns?.length) {
    const en = await payload.updateGlobal({
      slug: 'sessions-settings',
      locale: 'en',
      data: { addOns: ADD_ONS.map((a) => ({ label: a.label.en, price: a.price.en })), priceNote: PRICE_NOTE.en },
    })
    await payload.updateGlobal({
      slug: 'sessions-settings',
      locale: 'de',
      data: {
        addOns: (en.addOns ?? []).map((row, i) => ({ id: row.id, label: ADD_ONS[i].label.de, price: ADD_ONS[i].price.de })),
        priceNote: PRICE_NOTE.de,
      },
    })
  }
}

export async function down({ payload }: MigrateDownArgs): Promise<void> {
  await payload.delete({ collection: 'offerings', where: { slug: { in: OFFERINGS.map((o) => o.slug) } } })
  await payload.updateGlobal({ slug: 'sessions-settings', data: { addOns: [] } })
}
