// Deposit and balance via Stripe Checkout (decision D2). The site creates the Checkout
// with server-computed amounts; results arrive by webhook and, as a fallback,
// when the client returns from Checkout. Every update only moves a payment
// forward, so repeated or out-of-order events are harmless.
import 'server-only'
import type Stripe from 'stripe'
import type { Payload } from 'payload'
import type { Client, Payment, Project } from '@/payload-types'
import { getStripe, METADATA_APP } from '@/lib/stripe'
import { formatCents, proposalSummary } from '@/lib/proposal'
import { siteUrl } from '@/lib/client-tokens'
import { isStage, stageIndex } from '@/lib/stages'
import { sendPaymentNotification, sendPaymentReceived } from '@/lib/email-client'
import { pushAdmins, pushProjectClients } from '@/lib/push'
import { getBilling } from '@/lib/billing'

type Status = Payment['status']
const RANK: Record<Status, number> = { open: 0, expired: 1, failed: 1, processing: 2, paid: 3, partially_refunded: 4, refunded: 5 }
const relId = (v: unknown) => (typeof v === 'object' && v !== null ? (v as { id: number }).id : (v as number | null | undefined))

export class PaymentError extends Error {}

const LABEL = {
  deposit: { en: 'Deposit', de: 'Anzahlung' },
  balance: { en: 'Balance', de: 'Restzahlung' },
} as const

/** Starts a Stripe Checkout for the deposit or the balance; returns its URL. */
export async function startCheckout(
  payload: Payload,
  project: Project,
  client: Client,
  locale: 'en' | 'de',
  kind: 'deposit' | 'balance' = 'deposit',
): Promise<string> {
  const stripe = getStripe()
  if (!stripe) throw new PaymentError('Payments are not configured')

  const existing = await payload.find({
    collection: 'payments',
    where: { project: { equals: project.id } },
    limit: 0,
    pagination: false,
    depth: 0,
    overrideAccess: true,
  })
  let amount: number
  if (kind === 'deposit') {
    const summary = proposalSummary(project)
    if (!summary || summary.depositCents < 50) throw new PaymentError('No deposit to pay')
    if (existing.docs.some((p) => p.kind === 'deposit' && ['paid', 'processing', 'partially_refunded'].includes(p.status))) {
      throw new PaymentError('The deposit is already paid')
    }
    amount = summary.depositCents
  } else {
    if (existing.docs.some((p) => p.status === 'processing')) throw new PaymentError('A payment is still being processed')
    amount = (await getBilling(payload, project)).dueCents
    if (amount < 50) throw new PaymentError('Nothing left to pay')
  }
  // Only one Checkout at a time: close older open ones (also of the other kind,
  // so an old deposit tab cannot be paid on top of the balance)
  for (const old of existing.docs.filter((p) => p.status === 'open' && p.stripeSessionId)) {
    await stripe.checkout.sessions.expire(old.stripeSessionId as string).catch(() => {})
    await payload.update({ collection: 'payments', id: old.id, data: { status: 'expired' }, overrideAccess: true })
  }

  const label = `${LABEL[kind][locale]} — ${project.title}`
  const payment = await payload.create({
    collection: 'payments',
    data: { project: project.id, client: client.id, kind, label, amount, currency: 'eur', status: 'open' },
    overrideAccess: true,
  })
  const metadata = { app: METADATA_APP, paymentId: String(payment.id), projectId: String(project.id), kind }
  const back = kind === 'balance' ? `/c/${project.slug}/photos` : `/c/${project.slug}`

  const session = await stripe.checkout.sessions.create({
    mode: 'payment',
    customer_email: client.email,
    client_reference_id: String(payment.id),
    locale: locale === 'de' ? 'de' : 'en',
    line_items: [{ quantity: 1, price_data: { currency: 'eur', unit_amount: amount, product_data: { name: label } } }],
    metadata,
    payment_intent_data: { metadata, description: label },
    success_url: siteUrl(`${back}?payment=success`, locale),
    cancel_url: siteUrl(`${back}?payment=cancelled`, locale),
  })
  await payload.update({
    collection: 'payments',
    id: payment.id,
    data: { stripeSessionId: session.id, checkoutUrl: session.url, livemode: session.livemode },
    overrideAccess: true,
  })
  if (!session.url) throw new PaymentError('Stripe returned no checkout URL')
  return session.url
}

/** Our payment for a Checkout Session, or null for sessions of other apps on the account. */
async function paymentForSession(payload: Payload, session: Stripe.Checkout.Session): Promise<Payment | null> {
  if (session.metadata?.app !== METADATA_APP) return null
  const res = await payload.find({
    collection: 'payments',
    where: { stripeSessionId: { equals: session.id } },
    limit: 1,
    depth: 0,
    overrideAccess: true,
  })
  return res.docs[0] ?? null
}

function statusOf(session: Stripe.Checkout.Session, asyncResult?: 'succeeded' | 'failed'): Status {
  if (asyncResult === 'failed') return 'failed'
  if (asyncResult === 'succeeded') return 'paid'
  if (session.status === 'expired') return 'expired'
  if (session.payment_status === 'paid' || session.payment_status === 'no_payment_required') return 'paid'
  if (session.status === 'complete') return 'processing' // e.g. SEPA, settles later
  return 'open'
}

/** Applies a Checkout Session's state to its payment. Safe to call repeatedly. */
export async function applyCheckoutSession(
  payload: Payload,
  session: Stripe.Checkout.Session,
  asyncResult?: 'succeeded' | 'failed',
): Promise<boolean> {
  const payment = await paymentForSession(payload, session)
  if (!payment) return false
  const next = statusOf(session, asyncResult)
  // Forward only (a late "processing" never overrides "paid"); failed may follow processing
  const allowed = RANK[next] > RANK[payment.status] || (next === 'failed' && payment.status === 'processing')
  if (!allowed) return true

  const intent = typeof session.payment_intent === 'string' ? session.payment_intent : session.payment_intent?.id
  const updated = await payload.update({
    collection: 'payments',
    id: payment.id,
    data: {
      status: next,
      ...(intent && { paymentIntentId: intent }),
      ...(next === 'paid' && { paidAt: new Date().toISOString() }),
    },
    overrideAccess: true,
  })
  if (next === 'paid') await onPaid(payload, updated)
  else if (next === 'failed' || next === 'processing') await logPayment(payload, updated, next === 'failed' ? 'Payment failed' : 'Payment processing (bank transfer)')
  return true
}

/** Syncs refunds made in the Stripe Dashboard. */
export async function applyRefund(payload: Payload, charge: Stripe.Charge): Promise<boolean> {
  const intent = typeof charge.payment_intent === 'string' ? charge.payment_intent : charge.payment_intent?.id
  if (!intent) return false
  // Only payments this site created (other apps share the Stripe account)
  const res = await payload.find({ collection: 'payments', where: { paymentIntentId: { equals: intent } }, limit: 1, depth: 0, overrideAccess: true })
  const payment = res.docs[0]
  if (!payment) return false
  const refunded = charge.amount_refunded
  const status: Status = refunded >= payment.amount ? 'refunded' : refunded > 0 ? 'partially_refunded' : payment.status
  if (refunded === (payment.refunded ?? 0) && status === payment.status) return true
  const updated = await payload.update({ collection: 'payments', id: payment.id, data: { refunded, status }, overrideAccess: true })
  await logPayment(payload, updated, `Refunded ${formatCents(refunded, 'en')}`, true)
  return true
}

/** On return from Checkout: ask Stripe directly, in case the webhook is late or missing. */
export async function refreshOpenPayments(payload: Payload, projectId: number) {
  const stripe = getStripe()
  if (!stripe) return
  const open = await payload.find({
    collection: 'payments',
    where: { and: [{ project: { equals: projectId } }, { status: { in: ['open', 'processing'] } }, { stripeSessionId: { exists: true } }] },
    limit: 10,
    depth: 0,
    overrideAccess: true,
  })
  for (const p of open.docs) {
    try {
      await applyCheckoutSession(payload, await stripe.checkout.sessions.retrieve(p.stripeSessionId as string))
    } catch (err) {
      console.error('[payments] refresh failed:', err)
    }
  }
}

async function logPayment(payload: Payload, payment: Payment, message: string, clientVisible = false) {
  await payload.create({
    collection: 'activity',
    data: { project: relId(payment.project) as number, actor: 'system', verb: 'note', clientVisible, message: `${message}: ${payment.label}` },
    overrideAccess: true,
  })
}

async function onPaid(payload: Payload, payment: Payment) {
  const projectId = relId(payment.project) as number
  const project = await payload.findByID({ collection: 'projects', id: projectId, depth: 1, overrideAccess: true })
  const amount = formatCents(payment.amount, 'en')

  if (payment.kind === 'deposit') {
    const stage = isStage(project.stage) ? project.stage : 'proposal'
    if (stageIndex(stage) < stageIndex('booked')) {
      await payload.update({ collection: 'projects', id: projectId, data: { stage: 'booked' }, context: { skipFolders: true }, overrideAccess: true })
    }
  }
  await payload.create({
    collection: 'activity',
    data: { project: projectId, actor: 'system', verb: 'note', clientVisible: true, message: `Payment received (${amount}): ${payment.label}` },
    overrideAccess: true,
  })

  // Balance in full: the downloads open
  if (project.delivery?.deliveredAt && !(await getBilling(payload, project)).locked && payment.kind !== 'deposit') {
    await onBalanceSettled(project)
  }

  await pushAdmins(`💶 ${amount} received`, `${payment.label}${payment.livemode ? '' : ' (test mode)'}`, `/studio/projects/${projectId}`)
  const clientId = relId(payment.client)
  const client = (project.clients ?? []).find((c): c is Client => typeof c === 'object' && c?.id === clientId)
  await Promise.allSettled([
    sendPaymentNotification({ projectTitle: project.title, label: payment.label, amount, livemode: Boolean(payment.livemode) }),
    client &&
      sendPaymentReceived({
        to: client.email,
        name: client.name.split(' ')[0],
        locale: client.locale === 'de' ? 'de' : 'en',
        amount: formatCents(payment.amount, client.locale === 'de' ? 'de' : 'en'),
        kind: payment.kind,
        projectTitle: project.title,
        url: siteUrl(`/c/${project.slug}`, client.locale === 'de' ? 'de' : 'en'),
      }),
  ]).then((r) => r.forEach((x) => x.status === 'rejected' && console.error('[payments] email failed:', x.reason)))
}

/** Tells the clients that the downloads are open (balance paid online or marked by hand). */
export async function onBalanceSettled(project: Project) {
  if (!project.delivery?.deliveredAt) return
  await pushProjectClients(
    project,
    {
      en: { title: 'Downloads are open', body: `${project.title}: thank you — your photos are ready to download.` },
      de: { title: 'Downloads sind frei', body: `${project.title}: danke — deine Fotos stehen zum Download bereit.` },
    },
    '/photos',
    `balance-${project.id}`,
  )
}
