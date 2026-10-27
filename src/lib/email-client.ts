// Emails to clients about the portal: sign-in links and invitations.
import { MAIL_FROM, transporter } from './mailer'
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
