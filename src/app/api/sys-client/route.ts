import "server-only";
import { NextResponse } from "next/server";

// Proxies the Umami tracking script from the internal Umami instance.
// Visitors load this from the portfolio domain — no public Umami URL needed.
export async function GET() {
  const internalUrl = process.env.UMAMI_INTERNAL_URL;
  if (!internalUrl) {
    return new NextResponse("// analytics not configured", {
      headers: { "Content-Type": "application/javascript" },
    });
  }

  try {
    const res = await fetch(`${internalUrl}/script.js`, {
      next: { revalidate: 3600 }, // cache the script for 1 hour
    });
    const text = await res.text();
    return new NextResponse(text, {
      headers: {
        "Content-Type": "application/javascript",
        "Cache-Control": "public, max-age=3600",
      },
    });
  } catch {
    return new NextResponse("// analytics unavailable", {
      headers: { "Content-Type": "application/javascript" },
    });
  }
}
