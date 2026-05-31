import { NextRequest, NextResponse } from "next/server";

const NEXTCLOUD_URL = process.env.NEXTCLOUD_URL ?? "https://cloud.joeldettinger.de";
const NEXTCLOUD_USER = process.env.NEXTCLOUD_USER ?? "dettinjo";
const NEXTCLOUD_PASSWORD = process.env.NEXTCLOUD_PASSWORD ?? "";

export async function GET(req: NextRequest) {
  const path = req.nextUrl.searchParams.get("path");

  if (!path) {
    return NextResponse.json({ error: "Missing path" }, { status: 400 });
  }

  if (!NEXTCLOUD_PASSWORD) {
    return NextResponse.json({ error: "Nextcloud not configured" }, { status: 503 });
  }

  // Prevent path traversal
  const normalised = path.replace(/\.\./g, "").replace(/\/+/g, "/").replace(/^\//, "");

  const encoded = normalised.split("/").map(encodeURIComponent).join("/");
  const upstream = `${NEXTCLOUD_URL}/remote.php/dav/files/${NEXTCLOUD_USER}/${encoded}`;

  const auth = "Basic " + Buffer.from(`${NEXTCLOUD_USER}:${NEXTCLOUD_PASSWORD}`).toString("base64");

  const res = await fetch(upstream, { headers: { Authorization: auth } });

  if (!res.ok) {
    return NextResponse.json({ error: "File not found" }, { status: res.status });
  }

  const contentType = res.headers.get("content-type") ?? "image/jpeg";

  return new NextResponse(res.body, {
    headers: {
      "Content-Type": contentType,
      "Cache-Control": "public, max-age=86400, stale-while-revalidate=3600",
    },
  });
}
