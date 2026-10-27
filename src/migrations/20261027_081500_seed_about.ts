// Data only: fills the "About & FAQ" global with the texts that used to be
// hard-coded, plus a starter FAQ built from the decisions in docs/REDESIGN.md.
// Runs only while the global is still empty, so admin edits are never overwritten.
import type { MigrateUpArgs, MigrateDownArgs } from '@payloadcms/db-postgres'
import en from '../../messages/en/photography.json'
import de from '../../messages/de/photography.json'
import enSite from '../../messages/en/site.json'
import deSite from '../../messages/de/site.json'

type Text = { en: string; de: string }

const FAQ: Array<{ question: Text; answer: Text; onSessions: boolean }> = [
  {
    question: { en: 'How does booking work?', de: 'Wie läuft die Buchung ab?' },
    answer: {
      en: 'Tell me about your idea with “Plan your shoot” or just write me. We have a short chat about what you need, I send you a proposal, and a deposit secures your date.',
      de: 'Erzähl mir über „Plane dein Shooting“ von deiner Idee oder schreib mir einfach. Wir sprechen kurz darüber, was du brauchst, ich schicke dir ein Angebot, und eine Anzahlung sichert deinen Termin.',
    },
    onSessions: true,
  },
  {
    question: { en: 'When do I get my photos?', de: 'Wann bekomme ich meine Fotos?' },
    answer: {
      en: 'Usually within 7 to 10 days — each session lists its delivery time. For events there is a sneak peek within 48 hours, and express delivery is available as an add-on.',
      de: 'Meist innerhalb von 7 bis 10 Tagen – die Lieferzeit steht bei jedem Shooting dabei. Bei Events gibt es einen Sneak Peek innerhalb von 48 Stunden, Express-Lieferung ist als Extra möglich.',
    },
    onSessions: true,
  },
  {
    question: { en: 'How do I receive the photos?', de: 'Wie erhalte ich die Fotos?' },
    answer: {
      en: 'In a private online gallery, in full resolution and ready to download. The gallery stays online for 12 months — please keep a copy of your own.',
      de: 'In einer privaten Online-Galerie, in voller Auflösung zum Herunterladen. Die Galerie bleibt 12 Monate online – bitte speichere dir eine eigene Kopie.',
    },
    onSessions: true,
  },
  {
    question: { en: 'Can I choose which photos get edited?', de: 'Kann ich aussuchen, welche Fotos bearbeitet werden?' },
    answer: {
      en: 'Yes. You see the previews first and pick your favourites. Extra photos beyond the included number are possible at any time, and each session includes at least one round of changes.',
      de: 'Ja. Du siehst zuerst die Vorschauen und wählst deine Favoriten. Zusätzliche Fotos über die enthaltene Anzahl hinaus sind jederzeit möglich, und jedes Shooting enthält mindestens eine Korrekturrunde.',
    },
    onSessions: false,
  },
  {
    question: { en: 'Do you travel?', de: 'Kommst du auch zu mir?' },
    answer: {
      en: 'Gladly. Travel is charged at €0.50 per km; for longer trips we agree on it beforehand.',
      de: 'Gerne. Die Anfahrt kostet 0,50 € pro km; bei längeren Strecken sprechen wir das vorher ab.',
    },
    onSessions: true,
  },
  {
    question: { en: 'Will you post my photos?', de: 'Veröffentlichst du meine Fotos?' },
    answer: {
      en: 'Only if you agree. When you choose your photos you decide whether I may show them in my portfolio — saying no changes nothing else.',
      de: 'Nur wenn du zustimmst. Bei der Auswahl entscheidest du, ob ich sie in meinem Portfolio zeigen darf – ein Nein ändert sonst nichts.',
    },
    onSessions: false,
  },
  {
    question: { en: 'Is anything added to the prices?', de: 'Kommt zu den Preisen noch etwas dazu?' },
    answer: {
      en: 'No. All prices are final amounts — only the add-ons you choose are added.',
      de: 'Nein. Alle Preise sind Endpreise – dazu kommen nur die Extras, die du auswählst.',
    },
    onSessions: true,
  },
]

export async function up({ payload }: MigrateUpArgs): Promise<void> {
  const current = await payload.findGlobal({ slug: 'about-page', locale: 'en', depth: 0, fallbackLocale: false })
  if (current.bio || current.faq?.length) return

  const saved = await payload.updateGlobal({
    slug: 'about-page',
    locale: 'en',
    data: {
      bio: en.PhotographyPage.profileBio,
      approachTitle: enSite.Site.about.approachTitle,
      approach: enSite.Site.about.approach,
      faq: FAQ.map((f) => ({ question: f.question.en, answer: f.answer.en, onSessions: f.onSessions })),
    },
  })
  await payload.updateGlobal({
    slug: 'about-page',
    locale: 'de',
    data: {
      bio: de.PhotographyPage.profileBio,
      approachTitle: deSite.Site.about.approachTitle,
      approach: deSite.Site.about.approach,
      faq: (saved.faq ?? []).map((row, i) => ({
        id: row.id,
        question: FAQ[i].question.de,
        answer: FAQ[i].answer.de,
        onSessions: row.onSessions,
      })),
    },
  })
}

export async function down({ payload }: MigrateDownArgs): Promise<void> {
  await payload.updateGlobal({ slug: 'about-page', data: { faq: [] } })
}
