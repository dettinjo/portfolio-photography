// /about texts and the FAQ, read from the "About & FAQ" global.
import 'server-only'
import type { Media } from '@/payload-types'
import { getPayloadClient } from '@/lib/payload'
import type { Locale } from '@/lib/portfolio'

export interface FaqItem {
  question: string
  /** Paragraphs */
  answer: string[]
  onSessions: boolean
}

export interface AboutContent {
  portrait: { url: string; alt: string | null } | null
  /** Paragraphs; empty when nothing is set (the page then uses its built-in text) */
  bio: string[]
  approachTitle: string | null
  approach: string[]
  facts: { label: string; value: string }[]
  faq: FaqItem[]
}

export const paragraphs = (text: string | null | undefined) =>
  (text ?? '')
    .split(/\n\s*\n/)
    .map((p) => p.trim())
    .filter(Boolean)

const EMPTY: AboutContent = { portrait: null, bio: [], approachTitle: null, approach: [], facts: [], faq: [] }

export async function getAbout(locale: Locale): Promise<AboutContent> {
  try {
    const payload = await getPayloadClient()
    const doc = await payload.findGlobal({ slug: 'about-page', locale, depth: 1 })
    const media = doc.portrait && typeof doc.portrait === 'object' ? (doc.portrait as Media) : null
    return {
      portrait: media?.url ? { url: media.url, alt: media.alt ?? null } : null,
      bio: paragraphs(doc.bio),
      approachTitle: doc.approachTitle || null,
      approach: paragraphs(doc.approach),
      facts: (doc.facts ?? []).filter((f) => f.label && f.value).map((f) => ({ label: f.label, value: f.value })),
      faq: (doc.faq ?? [])
        .filter((f) => f.question && f.answer)
        .map((f) => ({ question: f.question, answer: paragraphs(f.answer), onSessions: Boolean(f.onSessions) })),
    }
  } catch (err) {
    console.error('[about] failed to load about page:', err)
    return EMPTY
  }
}
