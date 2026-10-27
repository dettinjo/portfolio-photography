// Reviews and per-photo publication consent from the portal.
import 'server-only'
import type { Payload } from 'payload'
import type { Client, Project } from '@/payload-types'

/** Applies { photoId: true|false } to the project's finals; other ids are ignored. Returns how many changed. */
export async function applyConsent(payload: Payload, project: Project, client: Client, consent: unknown): Promise<number> {
  if (!consent || typeof consent !== 'object') return 0
  const wanted = new Map<number, boolean>()
  for (const [id, value] of Object.entries(consent as Record<string, unknown>)) {
    if (/^\d{1,12}$/.test(id) && typeof value === 'boolean') wanted.set(Number(id), value)
  }
  if (!wanted.size) return 0
  const finals = await payload.find({
    collection: 'photos',
    where: { and: [{ project: { equals: project.id } }, { purpose: { equals: 'final' } }, { id: { in: [...wanted.keys()] } }] },
    limit: 0,
    pagination: false,
    depth: 0,
    overrideAccess: true,
  })
  let changed = 0
  const now = new Date().toISOString()
  for (const photo of finals.docs) {
    const next = wanted.get(photo.id) ? 'yes' : 'no'
    if (photo.publishConsent === next) continue
    await payload.update({
      collection: 'photos',
      id: photo.id,
      data: { publishConsent: next, consentBy: client.id, consentAt: now },
      overrideAccess: true,
    })
    changed++
  }
  return changed
}

export const RATING_KEYS = ['communication', 'creativity', 'professionalism', 'value'] as const
export const stars = (v: unknown) => (Number.isInteger(v) && (v as number) >= 1 && (v as number) <= 5 ? (v as number) : null)
