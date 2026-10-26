import { NextRequest, NextResponse } from "next/server";
import { transporter, MAIL_FROM, ADMIN_TO } from "@/lib/mailer";
import { clientIp, escapeHtml, isEmail, rateLimit, singleLine } from "@/lib/security";

export async function POST(req: NextRequest) {
  if (!rateLimit(`contact:${clientIp(req)}`, 5, 10 * 60 * 1000)) {
    return NextResponse.json({ error: "Too many messages. Please try again later." }, { status: 429 });
  }

  let fields: Record<string, unknown>;
  const contentType = req.headers.get("content-type") ?? "";
  try {
    fields = contentType.includes("application/json")
      ? await req.json()
      : Object.fromEntries((await req.formData()).entries());
  } catch {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }

  // Honeypot: real visitors never fill the hidden "website" field.
  if (fields.website) return NextResponse.json({ ok: true });

  const name = singleLine(fields.name, 100);
  const email = singleLine(fields.email, 254);
  const message = String(fields.message ?? "").trim().slice(0, 5000);

  if (!name || !message || !isEmail(email)) {
    return NextResponse.json({ error: "Missing or invalid fields" }, { status: 400 });
  }

  const domain = process.env.NEXT_PUBLIC_PHOTOGRAPHY_DOMAIN ?? "";

  try {
    await transporter.sendMail({
      from: `"Joel Dettinger Photography" <${MAIL_FROM}>`,
      to: ADMIN_TO,
      replyTo: { name, address: email },
      subject: `New contact message from ${name}`,
      text: `Name: ${name}\nEmail: ${email}\n\n${message}`,
      html: `
        <div style="font-family:sans-serif;max-width:600px">
          <h2>New contact request</h2>
          <table style="width:100%;border-collapse:collapse">
            <tr><td style="padding:6px 0;color:#666;width:80px">Name</td><td><strong>${escapeHtml(name)}</strong></td></tr>
            <tr><td style="padding:6px 0;color:#666">Email</td><td><a href="mailto:${escapeHtml(email)}">${escapeHtml(email)}</a></td></tr>
          </table>
          <hr style="border:none;border-top:1px solid #eee;margin:16px 0">
          <p style="white-space:pre-wrap">${escapeHtml(message)}</p>
        </div>
      `,
    });

    // Auto-reply to sender
    await transporter.sendMail({
      from: `"Joel Dettinger Photography" <${MAIL_FROM}>`,
      to: { name, address: email },
      subject: "Thanks for reaching out!",
      html: `
        <div style="font-family:sans-serif;max-width:600px">
          <p>Hi ${escapeHtml(name)},</p>
          <p>Thanks for your message — I'll get back to you as soon as possible.</p>
          <hr style="border:none;border-top:1px solid #eee;margin:24px 0">
          <p style="color:#666;font-size:13px">
            Joel Dettinger Photography ·
            <a href="https://${escapeHtml(domain)}">${escapeHtml(domain)}</a>
          </p>
        </div>
      `,
    });

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("[contact] send failed:", err);
    return NextResponse.json({ error: "Send failed" }, { status: 500 });
  }
}
