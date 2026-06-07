import "server-only";
import { NextRequest, NextResponse } from "next/server";

// Proxies Umami analytics events from visitors' browsers to the internal
// Umami instance. Umami's script posts to /api/sys-events on the same origin as
// the script was loaded from — which is the portfolio domain.
export async function POST(request: NextRequest) {
  const internalUrl = process.env.UMAMI_INTERNAL_URL;
  if (!internalUrl) {
    // Silently drop events when analytics is not configured
    return NextResponse.json({ ok: true });
  }

  try {
    const body = await request.text();
    const res = await fetch(`${internalUrl}/sys-events`, {
      method: "POST",
      headers: {
        "Content-Type":
          request.headers.get("Content-Type") ?? "application/json",
        "User-Agent": request.headers.get("User-Agent") ?? "",
        // Forward real visitor IP so Umami can geo-locate correctly
        "X-Forwarded-For":
          request.headers.get("x-forwarded-for") ??
          request.headers.get("x-real-ip") ??
          "",
      },
      body,
    });
    return new NextResponse(res.body, { status: res.status });
  } catch {
    return NextResponse.json({ ok: true });
  }
}
