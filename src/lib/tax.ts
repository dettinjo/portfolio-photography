// The tax note under proposals, from the Billing settings (decision D6).
import 'server-only'
import { getPayloadClient } from '@/lib/payload'
import { formatCents } from '@/lib/proposal'

export type TaxMode = 'none' | 'smallBusiness' | 'vat'

export async function getTax(): Promise<{ mode: TaxMode; rate: number }> {
  try {
    const payload = await getPayloadClient()
    const doc = await payload.findGlobal({ slug: 'billing-settings', depth: 0, overrideAccess: true })
    return { mode: (doc.taxMode ?? 'none') as TaxMode, rate: doc.vatRate ?? 19 }
  } catch {
    return { mode: 'none', rate: 19 }
  }
}

const COPY = {
  en: {
    none: 'All prices are final amounts.',
    smallBusiness: 'No VAT is charged under the small business rule (§ 19 UStG).',
    vat: (rate: number, amount: string) => `All prices include ${rate} % VAT (${amount}).`,
  },
  de: {
    none: 'Alle Preise sind Endpreise.',
    smallBusiness: 'Gemäß § 19 UStG wird keine Umsatzsteuer berechnet.',
    vat: (rate: number, amount: string) => `Alle Preise inkl. ${rate} % USt. (${amount}).`,
  },
}

/** The note for a total in cents; with VAT, its included share is shown. */
export async function taxNote(totalCents: number, locale: 'en' | 'de'): Promise<string> {
  const { mode, rate } = await getTax()
  const c = COPY[locale]
  if (mode === 'smallBusiness') return c.smallBusiness
  if (mode === 'vat' && rate > 0) return c.vat(rate, formatCents(Math.round(totalCents - totalCents / (1 + rate / 100)), locale))
  return c.none
}
