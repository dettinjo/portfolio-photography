import { type NextRequest } from "next/server";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "fs";
import path from "path";
import sharp from "sharp";
import { PORTFOLIO_DAV_PATH } from "@/lib/nextcloud";

const NEXTCLOUD_URL = process.env.NEXTCLOUD_URL ?? "https://cloud.joeldettinger.de";
const NEXTCLOUD_USER = process.env.NEXTCLOUD_USER ?? "dettinjo";
const NEXTCLOUD_PASSWORD = process.env.NEXTCLOUD_PASSWORD ?? "";

// Persistent cache dir — kept alive by the volume mount on /app/public/media.
const CACHE_DIR = process.env.IMAGE_CACHE_DIR ?? "/app/public/media/.cache";

// Only these sizes are generated, so the cache cannot be filled with arbitrary variants.
const ALLOWED_WIDTHS = [400, 800, 1200, 1600, 1920, 2400];
const DEFAULT_WIDTH = 1200;
const IMAGE_EXT = /\.(jpe?g|png|webp)$/i;

function getCachePath(normalisedPath: string, width: number): string {
  const slug = normalisedPath.replace(/\//g, "__").replace(/\.[^.]+$/, "");
  return path.join(CACHE_DIR, `${slug}__w${width}.webp`);
}

function ensureCacheDir(): void {
  if (!existsSync(CACHE_DIR)) mkdirSync(CACHE_DIR, { recursive: true });
}

function toArrayBuffer(u: Uint8Array): ArrayBuffer {
  return u.buffer.slice(u.byteOffset, u.byteOffset + u.byteLength) as ArrayBuffer;
}

function webpResponse(body: Uint8Array, cacheHit: boolean): Response {
  return new Response(toArrayBuffer(body), {
    headers: {
      "Content-Type": "image/webp",
      "Cache-Control": "public, max-age=2592000, stale-while-revalidate=86400",
      "X-Cache": cacheHit ? "HIT" : "MISS",
    },
  });
}

/**
 * Returns the normalised Nextcloud path if it points to an image inside the
 * portfolio folder, otherwise null. Rejects traversal and dot segments.
 */
function resolvePortfolioPath(rawPath: string): string | null {
  const segments = rawPath.split("/").filter(Boolean);
  if (segments.some((s) => s === "." || s === ".." || s.includes("\\") || s.includes("\0"))) {
    return null;
  }
  const normalised = segments.join("/");
  if (!normalised.startsWith(`${PORTFOLIO_DAV_PATH}/`)) return null;
  if (!IMAGE_EXT.test(normalised)) return null;
  return normalised;
}

export async function GET(req: NextRequest): Promise<Response> {
  const rawPath = req.nextUrl.searchParams.get("path");
  const widthParam = req.nextUrl.searchParams.get("w");

  if (!rawPath) return Response.json({ error: "Missing path" }, { status: 400 });

  const normalised = resolvePortfolioPath(rawPath);
  if (!normalised) return Response.json({ error: "Not allowed" }, { status: 403 });
  if (!NEXTCLOUD_PASSWORD) return Response.json({ error: "Not configured" }, { status: 503 });

  const requested = widthParam ? parseInt(widthParam, 10) : DEFAULT_WIDTH;
  const width = ALLOWED_WIDTHS.includes(requested) ? requested : DEFAULT_WIDTH;
  const cachePath = getCachePath(normalised, width);

  // ── Serve from disk cache ────────────────────────────────────────────────
  try {
    if (existsSync(cachePath)) {
      const data = new Uint8Array(readFileSync(cachePath));
      return webpResponse(data, true);
    }
  } catch { /* cache read failed — fall through */ }

  // ── Fetch from Nextcloud ─────────────────────────────────────────────────
  const encoded = normalised.split("/").map(encodeURIComponent).join("/");
  const upstream = `${NEXTCLOUD_URL}/remote.php/dav/files/${NEXTCLOUD_USER}/${encoded}`;
  const auth = "Basic " + Buffer.from(`${NEXTCLOUD_USER}:${NEXTCLOUD_PASSWORD}`).toString("base64");

  let upstream_res: Response;
  try {
    upstream_res = await fetch(upstream, {
      headers: { Authorization: auth },
      signal: AbortSignal.timeout(30000),
    });
  } catch {
    return Response.json({ error: "Upstream timeout" }, { status: 504 });
  }

  if (!upstream_res.ok) {
    return Response.json({ error: "File not found" }, { status: upstream_res.status === 404 ? 404 : 502 });
  }

  const srcBuffer = Buffer.from(await upstream_res.arrayBuffer());

  // ── Convert to WebP ───────────────────────────────────────────────────────
  // Never pass the original bytes through: anything sharp cannot decode is rejected.
  let webpBytes: Uint8Array;
  try {
    const converted = await sharp(srcBuffer)
      .rotate()
      .resize({ width, withoutEnlargement: true })
      .webp({ quality: 82 })
      .toBuffer();
    webpBytes = new Uint8Array(converted);
  } catch {
    return Response.json({ error: "Unsupported image" }, { status: 415 });
  }

  // ── Persist to disk cache ────────────────────────────────────────────────
  try {
    ensureCacheDir();
    writeFileSync(cachePath, webpBytes);
  } catch { /* non-fatal */ }

  return webpResponse(webpBytes, false);
}
