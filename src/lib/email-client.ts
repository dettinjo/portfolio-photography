// Emails to clients about the portal: sign-in links and invitations.
import { ADMIN_TO, MAIL_FROM, transporter } from './mailer'
import { escapeHtml as e } from './security'

const FROM = `"Joel Dettinger Photography" <${MAIL_FROM}>`

const COPY = {
  en: {
    login: {
      subject: 'Your sign-in link',
      body: 'here is your link to your project space. It works once and for 30 minutes.',
    },
    invite: {
      subject: (p: string) => `Your project space is ready — ${p}`,
      body: (p: string) =>
        `I've set up a project space for “${p}”. That's where you'll find our plan, the next steps and, later, your photos. The link works once and for 7 days — afterwards you can ask for a new one on the sign-in page anytime.`,
    },
    button: 'Open my project',
    ignore: "If you didn't ask for this, you can ignore this email.",
    hi: (n: string) => `Hi ${n},`,
  },
  de: {
    login: {
      subject: 'Dein Anmeldelink',
      body: 'hier ist dein Link zu deinem Projektbereich. Er funktioniert einmal und 30 Minuten lang.',
    },
    invite: {
      subject: (p: string) => `Dein Projektbereich ist bereit — ${p}`,
      body: (p: string) =>
        `Ich habe einen Projektbereich für „${p}“ eingerichtet. Dort findest du unseren Plan, die nächsten Schritte und später deine Fotos. Der Link funktioniert einmal und 7 Tage lang — danach kannst du dir auf der Anmeldeseite jederzeit einen neuen schicken lassen.`,
    },
    button: 'Mein Projekt öffnen',
    ignore: 'Falls du das nicht angefordert hast, kannst du diese E-Mail ignorieren.',
    hi: (n: string) => `Hallo ${n},`,
  },
}

export async function sendSignInEmail(opts: {
  to: string
  name: string
  locale: 'en' | 'de'
  url: string
  kind: 'login' | 'invite'
  projectTitle?: string
}) {
  const c = COPY[opts.locale]
  const project = opts.projectTitle ?? ''
  const subject = opts.kind === 'invite' ? c.invite.subject(project) : c.login.subject
  const body = opts.kind === 'invite' ? c.invite.body(project) : c.login.body
  await transporter.sendMail({
    from: FROM,
    to: opts.to,
    subject,
    text: `${c.hi(opts.name)}\n\n${body}\n\n${opts.url}\n\n${c.ignore}\n\nJoel`,
    html: `<div style="font-family:sans-serif;max-width:560px;color:#111;line-height:1.5">
      <p>${e(c.hi(opts.name))}</p>
      <p>${e(body)}</p>
      <p style="margin:28px 0"><a href="${e(opts.url)}" style="background:#111;color:#fff;padding:12px 22px;text-decoration:none;display:inline-block">${e(c.button)} →</a></p>
      <p style="color:#777;font-size:13px">${e(c.ignore)}</p>
      <p>Joel</p>
    </div>`,
  })
}

const READY = {
  en: {
    subject: (p: string) => `Your previews are ready — ${p}`,
    body: (n: number) =>
      `${n} previews are waiting for you. Pick your favourites — those are the ones I'll edit. You can leave a note on any photo, right where you want something changed.`,
    button: 'Choose my photos',
    hi: (n: string) => `Hi ${n},`,
  },
  de: {
    subject: (p: string) => `Deine Vorschauen sind da — ${p}`,
    body: (n: number) =>
      `${n} Vorschauen warten auf dich. Wähle deine Favoriten — genau die bearbeite ich. Du kannst an jedem Foto eine Notiz hinterlassen, direkt an der Stelle, die du geändert haben möchtest.`,
    button: 'Fotos auswählen',
    hi: (n: string) => `Hallo ${n},`,
  },
}

export async function sendPreviewsReadyEmail(opts: {
  to: string
  name: string
  locale: 'en' | 'de'
  count: number
  projectTitle: string
  url: string
}) {
  const c = READY[opts.locale]
  await transporter.sendMail({
    from: FROM,
    to: opts.to,
    subject: c.subject(opts.projectTitle),
    text: `${c.hi(opts.name)}\n\n${c.body(opts.count)}\n\n${opts.url}\n\nJoel`,
    html: `<div style="font-family:sans-serif;max-width:560px;color:#111;line-height:1.5">
      <p>${e(c.hi(opts.name))}</p>
      <p>${e(c.body(opts.count))}</p>
      <p style="margin:28px 0"><a href="${e(opts.url)}" style="background:#111;color:#fff;padding:12px 22px;text-decoration:none;display:inline-block">${e(c.button)} →</a></p>
      <p>Joel</p>
    </div>`,
  })
}

const SENT = {
  en: {
    subject: (p: string) => `Got your selection — ${p}`,
    body: (n: number) =>
      `thanks — your selection of ${n} photos arrived. I'm starting on the edits now and will let you know as soon as they're ready.`,
    extra: (n: number) => `That's ${n} more than included — I'll get back to you about the extra photos.`,
    hi: (n: string) => `Hi ${n},`,
  },
  de: {
    subject: (p: string) => `Deine Auswahl ist da — ${p}`,
    body: (n: number) =>
      `danke — deine Auswahl mit ${n} Fotos ist angekommen. Ich mache mich jetzt an die Bearbeitung und melde mich, sobald alles fertig ist.`,
    extra: (n: number) => `Das sind ${n} mehr als enthalten — wegen der zusätzlichen Fotos melde ich mich bei dir.`,
    hi: (n: string) => `Hallo ${n},`,
  },
}

export async function sendSelectionConfirmation(opts: {
  to: string
  name: string
  locale: 'en' | 'de'
  count: number
  extra: number
  projectTitle: string
  url: string
}) {
  const c = SENT[opts.locale]
  const paragraphs = [c.body(opts.count), ...(opts.extra ? [c.extra(opts.extra)] : [])]
  await transporter.sendMail({
    from: FROM,
    to: opts.to,
    subject: c.subject(opts.projectTitle),
    text: `${c.hi(opts.name)}\n\n${paragraphs.join('\n\n')}\n\n${opts.url}\n\nJoel`,
    html: `<div style="font-family:sans-serif;max-width:560px;color:#111;line-height:1.5">
      <p>${e(c.hi(opts.name))}</p>
      ${paragraphs.map((p) => `<p>${e(p)}</p>`).join('')}
      <p><a href="${e(opts.url)}">${e(opts.url)}</a></p>
      <p>Joel</p>
    </div>`,
  })
}

/** To the photographer: the selection arrived (with the Lightroom filter line). */
export async function sendSelectionNotification(opts: {
  projectTitle: string
  sentBy: string
  count: number
  extra: number
  folder: string | null
  writeError: string | null
  selectionText: string
}) {
  await transporter.sendMail({
    from: FROM,
    to: ADMIN_TO,
    subject: `✅ Selection: ${opts.count} photos — ${opts.projectTitle}`,
    text: [
      `${opts.sentBy} sent the selection for "${opts.projectTitle}": ${opts.count} photos${opts.extra ? ` (${opts.extra} extra)` : ''}.`,
      opts.writeError
        ? `⚠️ Could not write it to Nextcloud: ${opts.writeError}`
        : `Written to ${opts.folder}/_from-client/selection.txt and selection.csv.`,
      '',
      opts.selectionText,
    ].join('\n'),
  })
}

const PROPOSAL = {
  en: {
    subject: (p: string) => `Your proposal — ${p}`,
    body: 'your proposal is ready in your project space. Have a look, and if everything fits, accept it there — the deposit secures your date.',
    button: 'View my proposal',
  },
  de: {
    subject: (p: string) => `Dein Angebot — ${p}`,
    body: 'dein Angebot liegt in deinem Projektbereich bereit. Schau es dir in Ruhe an, und wenn alles passt, nimm es dort an — die Anzahlung sichert deinen Termin.',
    button: 'Angebot ansehen',
  },
}

export async function sendProposalEmail(opts: { to: string; name: string; locale: 'en' | 'de'; projectTitle: string; url: string }) {
  const c = PROPOSAL[opts.locale]
  const hi = COPY[opts.locale].hi(opts.name)
  await transporter.sendMail({
    from: FROM,
    to: opts.to,
    subject: c.subject(opts.projectTitle),
    text: `${hi}\n\n${c.body}\n\n${opts.url}\n\nJoel`,
    html: `<div style="font-family:sans-serif;max-width:560px;color:#111;line-height:1.5">
      <p>${e(hi)}</p><p>${e(c.body)}</p>
      <p style="margin:28px 0"><a href="${e(opts.url)}" style="background:#111;color:#fff;padding:12px 22px;text-decoration:none;display:inline-block">${e(c.button)} →</a></p>
      <p>Joel</p></div>`,
  })
}

const RECEIVED = {
  en: {
    subject: (p: string) => `Payment received — ${p}`,
    deposit: (a: string) => `thank you — your deposit of ${a} arrived, so your date is booked. Stripe sends you the receipt separately.`,
    other: (a: string) => `thank you — your payment of ${a} arrived. Stripe sends you the receipt separately.`,
  },
  de: {
    subject: (p: string) => `Zahlung erhalten — ${p}`,
    deposit: (a: string) => `danke — deine Anzahlung über ${a} ist angekommen, dein Termin ist damit gebucht. Die Quittung schickt dir Stripe separat.`,
    other: (a: string) => `danke — deine Zahlung über ${a} ist angekommen. Die Quittung schickt dir Stripe separat.`,
  },
}

export async function sendPaymentReceived(opts: {
  to: string
  name: string
  locale: 'en' | 'de'
  amount: string
  kind: string
  projectTitle: string
  url: string
}) {
  const c = RECEIVED[opts.locale]
  const hi = COPY[opts.locale].hi(opts.name)
  const body = opts.kind === 'deposit' ? c.deposit(opts.amount) : c.other(opts.amount)
  await transporter.sendMail({
    from: FROM,
    to: opts.to,
    subject: c.subject(opts.projectTitle),
    text: `${hi}\n\n${body}\n\n${opts.url}\n\nJoel`,
    html: `<div style="font-family:sans-serif;max-width:560px;color:#111;line-height:1.5">
      <p>${e(hi)}</p><p>${e(body)}</p><p><a href="${e(opts.url)}">${e(opts.url)}</a></p><p>Joel</p></div>`,
  })
}

/** To the photographer: money arrived. */
export async function sendPaymentNotification(opts: { projectTitle: string; label: string; amount: string; livemode: boolean }) {
  await transporter.sendMail({
    from: FROM,
    to: ADMIN_TO,
    subject: `💶 ${opts.amount} received — ${opts.projectTitle}${opts.livemode ? '' : ' (TEST MODE)'}`,
    text: `${opts.label}: ${opts.amount} paid via Stripe${opts.livemode ? '' : ' in test mode'}.`,
  })
}

/** To the photographer: a client accepted the proposal (and pays by hand when Stripe is off). */
export async function sendProposalAccepted(opts: { projectTitle: string; client: string; deposit: string; manual: boolean }) {
  await transporter.sendMail({
    from: FROM,
    to: ADMIN_TO,
    subject: `🤝 Proposal accepted — ${opts.projectTitle}`,
    text: `${opts.client} accepted the proposal for "${opts.projectTitle}". Deposit: ${opts.deposit}.${
      opts.manual ? '\n\nOnline payment is not configured — send the payment details by hand.' : '\n\nThey were sent to Stripe Checkout for the deposit.'
    }`,
  })
}

const REPLY = {
  en: { subject: (p: string) => `New message from Joel — ${p}`, button: 'Reply' },
  de: { subject: (p: string) => `Neue Nachricht von Joel — ${p}`, button: 'Antworten' },
}

/** To a client: the photographer wrote in the project thread. */
export async function sendMessageToClient(opts: { to: string; name: string; locale: 'en' | 'de'; projectTitle: string; body: string; url: string }) {
  const c = REPLY[opts.locale]
  const hi = COPY[opts.locale].hi(opts.name)
  await transporter.sendMail({
    from: FROM,
    to: opts.to,
    subject: c.subject(opts.projectTitle),
    text: `${hi}\n\n${opts.body}\n\n${opts.url}\n\nJoel`,
    html: `<div style="font-family:sans-serif;max-width:560px;color:#111;line-height:1.5">
      <p>${e(hi)}</p>
      <blockquote style="margin:16px 0;padding:12px 16px;border-left:3px solid #ff5a1f;background:#f6f4ef;white-space:pre-wrap">${e(opts.body)}</blockquote>
      <p style="margin:28px 0"><a href="${e(opts.url)}" style="background:#111;color:#fff;padding:12px 22px;text-decoration:none;display:inline-block">${e(c.button)} →</a></p>
    </div>`,
  })
}

/** To the photographer: a client wrote in the project thread (or updated the plan). */
export async function sendClientUpdateToAdmin(opts: { client: string; clientEmail: string; projectTitle: string; subject: string; body: string; adminUrl: string }) {
  await transporter.sendMail({
    from: FROM,
    to: ADMIN_TO,
    replyTo: opts.clientEmail,
    subject: `💬 ${opts.subject} — ${opts.projectTitle}`,
    text: `${opts.client}:\n\n${opts.body}\n\nAnswer in the admin (Inbox → Messages, project "${opts.projectTitle}"):\n${opts.adminUrl}`,
  })
}

const DELIVERY = {
  en: {
    subject: (p: string) => `Your photos are here — ${p}`,
    body: (n: number, until: string) =>
      `your ${n} final photos are ready. Download them in full resolution — one by one or all at once. The gallery stays online until ${until}; please keep a copy of your own.`,
    button: 'See my photos',
    remindSubject: (p: string, d: number) => `Your gallery closes in ${d} days — ${p}`,
    remindBody: (until: string) =>
      `a friendly reminder: your gallery stays online until ${until}. If you haven't yet, download your photos now — after that date they are removed from the website.`,
    remindButton: 'Download my photos',
  },
  de: {
    subject: (p: string) => `Deine Fotos sind da — ${p}`,
    body: (n: number, until: string) =>
      `deine ${n} fertigen Fotos sind bereit. Lade sie in voller Auflösung herunter — einzeln oder alle auf einmal. Die Galerie bleibt bis zum ${until} online; bitte speichere dir eine eigene Kopie.`,
    button: 'Meine Fotos ansehen',
    remindSubject: (p: string, d: number) => `Deine Galerie schließt in ${d} Tagen — ${p}`,
    remindBody: (until: string) =>
      `eine kurze Erinnerung: Deine Galerie ist noch bis zum ${until} online. Falls noch nicht geschehen, lade deine Fotos jetzt herunter — danach werden sie von der Website entfernt.`,
    remindButton: 'Fotos herunterladen',
  },
}

const longDate = (iso: string, locale: 'en' | 'de') =>
  new Intl.DateTimeFormat(locale === 'de' ? 'de-DE' : 'en-GB', { dateStyle: 'long', timeZone: 'Europe/Berlin' }).format(new Date(iso))

function buttonMail(hi: string, body: string, url: string, button: string) {
  return {
    text: `${hi}\n\n${body}\n\n${url}\n\nJoel`,
    html: `<div style="font-family:sans-serif;max-width:560px;color:#111;line-height:1.5">
      <p>${e(hi)}</p><p>${e(body)}</p>
      <p style="margin:28px 0"><a href="${e(url)}" style="background:#111;color:#fff;padding:12px 22px;text-decoration:none;display:inline-block">${e(button)} →</a></p>
      <p>Joel</p></div>`,
  }
}

export async function sendDeliveryEmail(opts: { to: string; name: string; locale: 'en' | 'de'; count: number; projectTitle: string; expiresAt: string; url: string }) {
  const c = DELIVERY[opts.locale]
  await transporter.sendMail({
    from: FROM,
    to: opts.to,
    subject: c.subject(opts.projectTitle),
    ...buttonMail(COPY[opts.locale].hi(opts.name), c.body(opts.count, longDate(opts.expiresAt, opts.locale)), opts.url, c.button),
  })
}

export async function sendExpiryReminder(opts: { to: string; name: string; locale: 'en' | 'de'; days: number; projectTitle: string; expiresAt: string; url: string }) {
  const c = DELIVERY[opts.locale]
  await transporter.sendMail({
    from: FROM,
    to: opts.to,
    subject: c.remindSubject(opts.projectTitle, opts.days),
    ...buttonMail(COPY[opts.locale].hi(opts.name), c.remindBody(longDate(opts.expiresAt, opts.locale)), opts.url, c.remindButton),
  })
}

const REVISED = {
  en: {
    subject: (p: string) => `Your changes are done — ${p}`,
    body: (n: number) => `I've made the ${n} changes you asked for. Have a look — slide between before and after, then approve them or tell me what's still not right.`,
    button: 'Review the changes',
  },
  de: {
    subject: (p: string) => `Deine Änderungen sind fertig — ${p}`,
    body: (n: number) => `ich habe die ${n} Änderungen umgesetzt, um die du gebeten hast. Schau sie dir an — schieb zwischen vorher und nachher hin und her, dann gib sie frei oder sag mir, was noch nicht passt.`,
    button: 'Änderungen ansehen',
  },
}

export async function sendRevisionsReady(opts: { to: string; name: string; locale: 'en' | 'de'; count: number; projectTitle: string; url: string }) {
  const c = REVISED[opts.locale]
  await transporter.sendMail({
    from: FROM,
    to: opts.to,
    subject: c.subject(opts.projectTitle),
    ...buttonMail(COPY[opts.locale].hi(opts.name), c.body(opts.count), opts.url, c.button),
  })
}

/** To the photographer: a round of change requests (with the Lightroom filter line). */
export async function sendRevisionsRequested(opts: { projectTitle: string; client: string; clientEmail: string; round: number; text: string; folder: string | null; writeError: string | null }) {
  await transporter.sendMail({
    from: FROM,
    to: ADMIN_TO,
    replyTo: opts.clientEmail,
    subject: `✏️ Changes, round ${opts.round} — ${opts.projectTitle}`,
    text: [
      `${opts.client} sent change requests (round ${opts.round}). Re-export the photos into "2 Final" — the client is told once all are done.`,
      opts.writeError ? `⚠️ Could not write the list to Nextcloud: ${opts.writeError}` : opts.folder ? `Written to ${opts.folder}/_from-client/revisions-round-${opts.round}.txt.` : '',
      '',
      opts.text,
    ].join('\n'),
  })
}
