import { escapeHtml as e, singleLine } from './security'
import { ADMIN_TO as ADMIN, MAIL_FROM, transporter } from './mailer'

const FROM = `"Joel Dettinger Photography" <${MAIL_FROM}>`
const PORTFOLIO_URL = process.env.NEXT_PUBLIC_PHOTOGRAPHY_DOMAIN
  ? `https://${process.env.NEXT_PUBLIC_PHOTOGRAPHY_DOMAIN}`
  : 'https://photosby.joeldettinger.de'
const ADMIN_URL = `${PORTFOLIO_URL}/admin`

// --------------------------------------------------------------------------
// Approval email — sent to client when album status is set to "notified"
// --------------------------------------------------------------------------

interface ApprovalEmailOptions {
  to: string
  clientName: string
  albumTitle: string
  approvalToken: string
}

export async function sendApprovalEmail({ to, clientName, albumTitle, approvalToken }: ApprovalEmailOptions) {
  const approvalUrl = `${PORTFOLIO_URL}/approve/${approvalToken}`

  await transporter.sendMail({
    from: FROM,
    to,
    subject: `Your photos are ready — ${singleLine(albumTitle)}`,
    html: `
      <div style="font-family:sans-serif;max-width:600px;margin:0 auto;color:#111">
        <h2>Hi ${e(clientName || 'there')} 👋</h2>
        <p>Your photos from <strong>${e(albumTitle)}</strong> are ready for review!</p>
        <p>Click the link below to view your gallery, select your favourite images, and leave any comments.</p>
        <p style="margin:32px 0">
          <a href="${approvalUrl}"
             style="background:#111;color:#fff;padding:14px 28px;border-radius:6px;text-decoration:none;font-weight:600">
            View &amp; approve your photos
          </a>
        </p>
        <p style="color:#666;font-size:13px">
          Or copy this link: <a href="${approvalUrl}">${approvalUrl}</a>
        </p>
        <hr style="border:none;border-top:1px solid #eee;margin:32px 0">
        <p style="color:#666;font-size:12px">
          Joel Dettinger Photography · <a href="${PORTFOLIO_URL}">${PORTFOLIO_URL}</a>
        </p>
      </div>
    `,
  })
}

// --------------------------------------------------------------------------
// Selections submitted — admin notification when a client finishes approval
// --------------------------------------------------------------------------

interface SelectionsSubmittedOptions {
  albumTitle: string
  albumSlug: string
  clientName?: string
  clientEmail?: string
  selectedCount: number
}

export async function sendSelectionsNotification({
  albumTitle, albumSlug, clientName, clientEmail, selectedCount,
}: SelectionsSubmittedOptions) {
  const adminUrl = `${ADMIN_URL}/collections/albums`

  await transporter.sendMail({
    from: FROM,
    to: ADMIN,
    subject: `✅ ${singleLine(clientName ?? 'Client')} selected ${selectedCount} photos — ${singleLine(albumTitle)}`,
    html: `
      <div style="font-family:sans-serif;max-width:600px;color:#111">
        <h2>Photo selection received</h2>
        <table style="border-collapse:collapse;width:100%">
          <tr><td style="padding:4px 0;color:#666;width:120px">Album</td><td><strong>${e(albumTitle)}</strong> (${e(albumSlug)})</td></tr>
          <tr><td style="padding:4px 0;color:#666">Client</td><td>${e(clientName ?? '—')}</td></tr>
          <tr><td style="padding:4px 0;color:#666">Email</td><td>${clientEmail ? `<a href="mailto:${e(clientEmail)}">${e(clientEmail)}</a>` : '—'}</td></tr>
          <tr><td style="padding:4px 0;color:#666">Selected</td><td><strong>${selectedCount} photos</strong></td></tr>
        </table>
        <p style="margin:24px 0">
          <a href="${adminUrl}"
             style="background:#111;color:#fff;padding:12px 24px;border-radius:6px;text-decoration:none;font-weight:600">
            Open CMS admin
          </a>
        </p>
      </div>
    `,
  })
}

// --------------------------------------------------------------------------
// New review — admin notification when a review is submitted publicly
// --------------------------------------------------------------------------

interface NewReviewOptions {
  reviewerName: string
  albumTitle?: string
  quote: string
}

export async function sendNewReviewNotification({ reviewerName, albumTitle, quote }: NewReviewOptions) {
  const adminUrl = `${ADMIN_URL}/collections/reviews`

  await transporter.sendMail({
    from: FROM,
    to: ADMIN,
    subject: `⭐ New review from ${singleLine(reviewerName)}${albumTitle ? ` — ${singleLine(albumTitle)}` : ''}`,
    html: `
      <div style="font-family:sans-serif;max-width:600px;color:#111">
        <h2>New review awaiting approval</h2>
        <p><strong>${e(reviewerName)}</strong>${albumTitle ? ` (${e(albumTitle)})` : ''} submitted a review:</p>
        <blockquote style="border-left:3px solid #eee;margin:16px 0;padding:8px 16px;color:#555;font-style:italic">
          "${e(quote)}"
        </blockquote>
        <p style="margin:24px 0">
          <a href="${adminUrl}"
             style="background:#111;color:#fff;padding:12px 24px;border-radius:6px;text-decoration:none;font-weight:600">
            Review in CMS admin
          </a>
        </p>
      </div>
    `,
  })
}
