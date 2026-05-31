import { NextRequest, NextResponse } from "next/server";
import { transporter, MAIL_FROM, ADMIN_TO } from "@/lib/mailer";

export async function POST(req: NextRequest) {
  let name: string, email: string, message: string;

  const contentType = req.headers.get("content-type") ?? "";

  if (contentType.includes("application/json")) {
    const body = await req.json();
    name = body.name ?? "";
    email = body.email ?? "";
    message = body.message ?? "";
  } else {
    // multipart/form-data or application/x-www-form-urlencoded
    const form = await req.formData();
    name = String(form.get("name") ?? "");
    email = String(form.get("email") ?? "");
    message = String(form.get("message") ?? "");
  }

  if (!name || !email || !message) {
    return NextResponse.json({ error: "Missing fields" }, { status: 400 });
  }

  try {
    await transporter.sendMail({
      from: `"Joel Dettinger Photography" <${MAIL_FROM}>`,
      to: ADMIN_TO,
      replyTo: `"${name}" <${email}>`,
      subject: `New contact message from ${name}`,
      html: `
        <div style="font-family:sans-serif;max-width:600px">
          <h2>New contact request</h2>
          <table style="width:100%;border-collapse:collapse">
            <tr><td style="padding:6px 0;color:#666;width:80px">Name</td><td><strong>${name}</strong></td></tr>
            <tr><td style="padding:6px 0;color:#666">Email</td><td><a href="mailto:${email}">${email}</a></td></tr>
          </table>
          <hr style="border:none;border-top:1px solid #eee;margin:16px 0">
          <p style="white-space:pre-wrap">${message}</p>
        </div>
      `,
    });

    // Auto-reply to sender
    await transporter.sendMail({
      from: `"Joel Dettinger Photography" <${MAIL_FROM}>`,
      to: email,
      subject: "Thanks for reaching out!",
      html: `
        <div style="font-family:sans-serif;max-width:600px">
          <p>Hi ${name},</p>
          <p>Thanks for your message — I'll get back to you as soon as possible.</p>
          <hr style="border:none;border-top:1px solid #eee;margin:24px 0">
          <p style="color:#666;font-size:13px">
            Joel Dettinger Photography ·
            <a href="https://${process.env.NEXT_PUBLIC_PHOTOGRAPHY_DOMAIN}">
              ${process.env.NEXT_PUBLIC_PHOTOGRAPHY_DOMAIN}
            </a>
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
