// The planning questionnaire: the offering's own questions, else the standard set.
import 'server-only'
import type { Project } from '@/payload-types'
import { getPayloadClient } from '@/lib/payload'
import { isStage, stageIndex } from '@/lib/stages'
import en from '../../messages/en/portal.json'
import de from '../../messages/de/portal.json'

export interface PlanQuestion {
  question: string
  help: string | null
}

export async function planQuestions(project: Project, locale: 'en' | 'de'): Promise<PlanQuestion[]> {
  const offeringId = typeof project.offering === 'object' ? project.offering?.id : project.offering
  if (offeringId) {
    const payload = await getPayloadClient()
    const offering = await payload.findByID({ collection: 'offerings', id: offeringId, locale, depth: 0, overrideAccess: true }).catch(() => null)
    const own = (offering?.planQuestions ?? []).filter((q) => q.question)
    if (own.length) return own.map((q) => ({ question: q.question, help: q.help || null }))
  }
  return (locale === 'de' ? de : en).Portal.plan.defaultQuestions.map((q) => ({ question: q.q, help: q.help || null }))
}

/** The plan can be edited until the shoot has happened. */
export const planLocked = (project: Project) => stageIndex(isStage(project.stage) ? project.stage : 'proposal') > stageIndex('shoot')

export const MOODBOARD_MAX = 30
export const UPLOAD_MAX_BYTES = 15 * 1024 * 1024
