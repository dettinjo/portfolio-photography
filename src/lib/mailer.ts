// Shared SMTP settings and nodemailer transport (contact form, notification
// emails and Payload's own emails).
import nodemailer from "nodemailer";

const port = Number(process.env.SMTP_PORT ?? 465);

export const smtpOptions = {
  host: process.env.SMTP_HOST ?? "web207.dogado.net",
  port,
  // 465 = implicit TLS. Any other port (587) must upgrade with STARTTLS —
  // Hetzner Cloud blocks outgoing 465, so production uses 587.
  secure: port === 465,
  requireTLS: true,
  auth: {
    user: process.env.SMTP_USER ?? "admin@joeldettinger.de",
    pass: process.env.SMTP_PASS ?? "",
  },
};

export const transporter = nodemailer.createTransport(smtpOptions);

export const MAIL_FROM = process.env.SMTP_FROM ?? "photosby@joeldettinger.de";
export const ADMIN_TO = process.env.ADMIN_EMAIL ?? "admin@joeldettinger.de";
