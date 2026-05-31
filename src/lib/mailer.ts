// Shared nodemailer transport for the photography portfolio.
// All outbound mail goes through Dogado SMTP with the photosby alias.
import nodemailer from "nodemailer";

const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST ?? "web207.dogado.net",
  port: Number(process.env.SMTP_PORT ?? 465),
  secure: true, // SSL on port 465
  auth: {
    user: process.env.SMTP_USER ?? "admin@joeldettinger.de",
    pass: process.env.SMTP_PASS ?? "",
  },
});

export const MAIL_FROM =
  process.env.SMTP_FROM ?? "photosby@joeldettinger.de";

export const ADMIN_TO =
  process.env.ADMIN_EMAIL ?? "admin@joeldettinger.de";

export { transporter };
