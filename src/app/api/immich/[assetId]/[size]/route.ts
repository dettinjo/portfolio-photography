// src/app/api/immich/[assetId]/[size]/route.ts
// Server-side proxy that fetches images from Immich with the API key so the
// key never reaches the browser. Results are publicly cacheable.

import { NextRequest, NextResponse } from "next/server";

const IMMICH_URL = process.env.IMMICH_URL ?? "";
const IMMICH_API_KEY = process.env.IMMICH_API_KEY ?? "";

const ALLOWED_SIZES = ["thumbnail", "original"] as const;
type AllowedSize = (typeof ALLOWED_SIZES)[number];

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ assetId: string; size: string }> }
) {
  const { assetId, size } = await params;

  if (!ALLOWED_SIZES.includes(size as AllowedSize)) {
    return NextResponse.json({ error: "Invalid size" }, { status: 400 });
  }

  if (!IMMICH_URL || !IMMICH_API_KEY) {
    return NextResponse.json(
      { error: "Immich not configured" },
      { status: 503 }
    );
  }

  const upstream =
    size === "thumbnail"
      ? `${IMMICH_URL}/api/assets/${assetId}/thumbnail?size=preview`
      : `${IMMICH_URL}/api/assets/${assetId}/original`;

  const res = await fetch(upstream, {
    headers: { "x-api-key": IMMICH_API_KEY },
  });

  if (!res.ok) {
    return NextResponse.json({ error: "Asset not found" }, { status: res.status });
  }

  const contentType = res.headers.get("content-type") ?? "image/jpeg";

  return new NextResponse(res.body, {
    headers: {
      "Content-Type": contentType,
      // Cache one year in CDN/browser — Immich asset IDs are immutable UUIDs
      "Cache-Control": "public, max-age=31536000, immutable",
    },
  });
}
