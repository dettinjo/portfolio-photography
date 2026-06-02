import { NextRequest, NextResponse } from "next/server";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "fs";
import path from "path";
import sharp from "sharp";

const NEXTCLOUD_URL = process.env.NEXTCLOUD_URL ?? "https://cloud.joeldettinger.de";
const NEXTCLOUD_USER = process.env.NEXTCLOUD_USER ?? "dettinjo";
const NEXTCLOUD_PASSWORD = process.env.NEXTCLOUD_PASSWORD ?? "";

// Cache directory — persisted via the /app/public/media volume mount.
// Converted WebP files are stored here so each source image is only
// fetched once and converted once.
const CACHE_DIR = process.env.IMAGE_CACHE_DIR ?? "/app/public/media/.cache";

function getCachePath(normalisedPath: string): string {
  // Replace slashes with underscores and force .webp extension
  const slug = normalisedPath.replace(/\//g, "__").replace(/\.[^.]+$/, "");
  return path.join(CACHE_DIR, `${slug}.webp`);
}

function ensureCacheDir(): void {
  if (!existsSync(CACHE_DIR)) {
    mkdirSync(CACHE_DIR, { recursive: true });
  }
}

export async function GET(req: NextRequest) {
  const rawPath = req.nextUrl.searchParams.get("path");
  const widthParam = req.nextUrl.searchParams.get("w");

  if (!rawPath) {
    return NextResponse.json({ error: "Missing path" }, { status: 400 });
  }

  if (!NEXTCLOUD_PASSWORD) {
    return NextResponse.json({ error: "Nextcloud not configured" }, { status: 503 });
  }

  // Prevent path traversal
  const normalised = rawPath.replace(/\.\./g, "").replace(/\/+/g, "/").replace(/^\//, "");
  const width = widthParam ? Math.min(parseInt(widthParam, 10) || 1200, 2400) : 1200;

  // Cache key includes width so different sizes are stored separately
  const cachePath = getCachePath(`${normalised}__w${width}`);

  // --- Serve from disk cache if available ---
  try {
    if (existsSync(cachePath)) {
      const cached = readFileSync(cachePath);
      return new NextResponse(cached, {
        headers: {
          "Content-Type": "image/webp",
          "Cache-Control": "public, max-age=2592000, stale-while-revalidate=86400",
          "X-Cache": "HIT",
        },
      });
    }
  } catch {
    // Cache read failed — fall through to fetch
  }

  // --- Fetch from Nextcloud ---
  const encoded = normalised.split("/").map(encodeURIComponent).join("/");
  const upstream = `${NEXTCLOUD_URL}/remote.php/dav/files/${NEXTCLOUD_USER}/${encoded}`;
  const auth = "Basic " + Buffer.from(`${NEXTCLOUD_USER}:${NEXTCLOUD_PASSWORD}`).toString("base64");

  let res: Response;
  try {
    res = await fetch(upstream, {
      headers: { Authorization: auth },
      signal: AbortSignal.timeout(30000),
    });
  } catch {
    return NextResponse.json({ error: "Upstream timeout" }, { status: 504 });
  }

  if (!res.ok) {
    return NextResponse.json({ error: "File not found" }, { status: res.status });
  }

  // --- Convert to WebP with sharp ---
  const buffer = Buffer.from(await res.arrayBuffer());
  let webp: Buffer;
  try {
    webp = await sharp(buffer)
      .resize({ width, withoutEnlargement: true })
      .webp({ quality: 82 })
      .toBuffer();
  } catch {
    // sharp failed (unsupported format?) — serve original
    return new NextResponse(buffer, {
      headers: {
        "Content-Type": res.headers.get("content-type") ?? "image/jpeg",
        "Cache-Control": "public, max-age=86400",
      },
    });
  }

  // --- Persist to disk cache ---
  try {
    ensureCacheDir();
    writeFileSync(cachePath, webp);
  } catch {
    // Cache write failed — non-fatal, still serve the converted image
  }

  return new NextResponse(webp, {
    headers: {
      "Content-Type": "image/webp",
      "Cache-Control": "public, max-age=2592000, stale-while-revalidate=86400",
      "X-Cache": "MISS",
    },
  });
}
