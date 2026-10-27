// Emails for "Plan your shoot": a notification to the photographer and a
// confirmation to the client (in their language).
import { ADMIN_TO, MAIL_FROM, transporter } from './mailer'
import { escapeHtml as e, singleLine } from './security'

export interface InquiryMail {
  id: number
  locale: 'en' | 'de'
  name: string
  email: string
  phone?: string
  offering?: string
  kind?: string
  date?: string
  dateFlexible: boolean
  location?: string
  size?: string
  budget?: string
  message?: string
  photoUrl?: string
}

const FROM = `"Joel Dettinger Photography" <${MAIL_FROM}>`
const SITE = process.env.NEXT_PUBLIC_PHOTOGRAPHY_DOMAIN
  ? `https://${process.env.NEXT_PUBLIC_PHOTOGRAPHY_DOMAIN}`
  : 'https://photosby.joeldettinger.de'

const COPY = {
  en: {
    subject: 'Got it — your shoot request',
    hi: (n: string) => `Hi ${n},`,
    body: "thanks for your request — it landed safely. I'll read it properly and get back to you personally within two days.",
    summary: 'What you sent',
    labels: { what: 'What', when: 'When', where: 'Where', size: 'Size', budget: 'Budget', message: 'Message' },
    flexible: 'flexible',
    sign: 'Joel',
  },
  de: {
    subject: 'Angekommen — deine Shooting-Anfrage',
    hi: (n: string) => `Hallo ${n},`,
    body: 'danke für deine Anfrage — sie ist gut angekommen. Ich lese sie in Ruhe und melde mich innerhalb von zwei Tagen persönlich bei dir.',
    summary: 'Deine Angaben',
    labels: { what: 'Was', when: 'Wann', where: 'Wo', size: 'Umfang', budget: 'Budget', message: 'Nachricht' },
    flexible: 'flexibel',
    sign: 'Joel',
  },
}

function rows(i: InquiryMail, copy: (typeof COPY)['en']) {
  const when = [i.date, i.dateFlexible ? copy.flexible : ''].filter(Boolean).join(' · ')
  return [
    [copy.labels.what, i.offering ?? i.kind],
    [copy.labels.when, when],
    [copy.labels.where, i.location],
    [copy.labels.size, i.size],
    [copy.labels.budget, i.budget],
    [copy.labels.message, i.message],
  ].filter(([, v]) => v) as [string, string][]
}

const table = (r: [string, string][]) =>
  `<table style="border-collapse:collapse;width:100%">${r
    .map(
      ([k, v]) =>
        `<tr><td style="padding:6px 12px 6px 0;color:#777;vertical-align:top;width:90px;font-family:monospace;font-size:12px;text-transform:uppercase">${e(k)}</td><td style="padding:6px 0;white-space:pre-wrap">${e(v)}</td></tr>`,
    )
    .join('')}</table>`

export async function sendInquiryNotification(i: InquiryMail) {
  const r = rows(i, COPY.en)
  await transporter.sendMail({
    from: FROM,
    to: ADMIN_TO,
    replyTo: { name: singleLine(i.name, 100), address: i.email },
    subject: `📷 New shoot request from ${singleLine(i.name, 80)}${i.offering ? ` — ${singleLine(i.offering, 60)}` : ''}`,
    text: [`${i.name} <${i.email}>${i.phone ? ` · ${i.phone}` : ''}`, ...r.map(([k, v]) => `${k}: ${v}`)].join('\n'),
    html: `<div style="font-family:sans-serif;max-width:600px;color:#111">
      <h2 style="margin:0 0 4px">New shoot request</h2>
      <p style="margin:0 0 16px;color:#555">${e(i.name)} · <a href="mailto:${e(i.email)}">${e(i.email)}</a>${i.phone ? ` · ${e(i.phone)}` : ''} · ${e(i.locale.toUpperCase())}</p>
      ${table(r)}
      ${i.photoUrl ? `<p style="margin-top:16px">Inspired by <a href="${e(i.photoUrl)}">this photo</a></p>` : ''}
      <p style="margin:24px 0"><a href="${SITE}/admin/collections/inquiries/${i.id}" style="background:#111;color:#fff;padding:12px 22px;text-decoration:none">Open in admin</a></p>
    </div>`,
  })
}

export async function sendInquiryConfirmation(i: InquiryMail) {
  const copy = COPY[i.locale]
  await transporter.sendMail({
    from: FROM,
    to: { name: singleLine(i.name, 100), address: i.email },
    subject: copy.subject,
    html: `<div style="font-family:sans-serif;max-width:600px;color:#111;line-height:1.5">
      <p>${e(copy.hi(i.name))}</p>
      <p>${e(copy.body)}</p>
      <p style="margin-top:24px;font-family:monospace;font-size:12px;letter-spacing:.1em;text-transform:uppercase;color:#777">${e(copy.summary)}</p>
      ${table(rows(i, copy))}
      <p style="margin-top:24px">— ${e(copy.sign)}</p>
      <p style="color:#999;font-size:12px"><a href="${SITE}" style="color:#999">${SITE.replace('https://', '')}</a></p>
    </div>`,
  })
}
