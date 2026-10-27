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
