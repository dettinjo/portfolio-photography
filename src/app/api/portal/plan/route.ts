// Save the plan: { project, answers: string[] (by question), shotList: { item, done }[] }
import { NextRequest } from 'next/server'
import { getPayloadClient } from '@/lib/payload'
import { json, portalRequest } from '@/lib/portal-api'
import { planLocked, planQuestions } from '@/lib/plan'
import { sendClientUpdateToAdmin } from '@/lib/email-client'
import { siteUrl } from '@/lib/client-tokens'

const text = (v: unknown, max: number) => (typeof v === 'string' ? v.trim().slice(0, max) : '')

export async function POST(req: NextRequest) {
  const r = await portalRequest(req, 60)
  if (r instanceof Response) return r
  const { client, project, body } = r
  if (planLocked(project)) return json({ error: 'The plan is read-only now' }, 409)

  const locale = client.locale === 'de' ? 'de' : 'en'
  const questions = await planQuestions(project, locale)
  const given = Array.isArray(body.answers) ? body.answers : []
  const answers = questions.map((q, i) => ({ question: q.question, answer: text(given[i], 2000) }))
  const shotList = (Array.isArray(body.shotList) ? body.shotList : [])
    .slice(0, 60)
    .map((s) => ({ item: text((s as { item?: unknown })?.item, 200), done: Boolean((s as { done?: unknown })?.done) }))
    .filter((s) => s.item)

  const payload = await getPayloadClient()
  const previous = project.plan?.updatedByClientAt ? new Date(project.plan.updatedByClientAt).getTime() : 0
  await payload.update({
    collection: 'projects',
    id: project.id,
    data: { plan: { ...project.plan, answers, shotList, updatedByClientAt: new Date().toISOString() } },
    context: { skipFolders: true },
    overrideAccess: true,
  })

  // Tell the photographer, at most once an hour
  if (Date.now() - previous > 60 * 60 * 1000) {
    const summary = [
      ...answers.filter((a) => a.answer).map((a) => `${a.question}\n${a.answer}`),
      ...(shotList.length ? [`Shot list:\n${shotList.map((s) => `- ${s.item}`).join('\n')}`] : []),
    ].join('\n\n')
    await sendClientUpdateToAdmin({
      client: client.name,
      clientEmail: client.email,
      projectTitle: project.title,
      subject: 'Plan updated',
      body: summary || '(empty)',
      adminUrl: siteUrl(`/admin/collections/projects/${project.id}`, 'en'),
    }).catch((err) => console.error('[plan] email failed:', err))
  }
  return json({ ok: true })
}
