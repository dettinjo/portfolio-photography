// Minimal Nextcloud WebDAV client used by the photo sync (src/lib/sync).
// Credentials stay on the server; the browser only ever sees processed images.
import 'server-only'

const NEXTCLOUD_URL = process.env.NEXTCLOUD_URL ?? "https://cloud.joeldettinger.de";
const NEXTCLOUD_USER = process.env.NEXTCLOUD_USER ?? "dettinjo";
const NEXTCLOUD_PASSWORD = process.env.NEXTCLOUD_PASSWORD ?? "";

/**
 * Only files below this folder are ever read by the site. Relative to the sync
 * account's files root — for a dedicated user with the folder shared to it,
 * that is the share's name (e.g. "Portfolio").
 */
export const PORTFOLIO_DAV_PATH = (process.env.NEXTCLOUD_PORTFOLIO_PATH || "Lightroom/Portfolio").replace(
  /^\/+|\/+$/g,
  "",
);

/**
 * Client projects live below this folder (Clients/<date> <name>/…). The sync
 * account needs write access here to create project folders and write
 * selections back.
 */
export const CLIENTS_DAV_PATH = (process.env.NEXTCLOUD_CLIENTS_PATH || "Lightroom/Clients").replace(/^\/+|\/+$/g, "");

/**
 * Webhook events report paths in the folder owner's namespace
 * ("/<owner>/files/Lightroom/Portfolio/…"), which differs from the sync
 * account's view when the folder is shared to a dedicated user.
 */
const WEBHOOK_PATH_PREFIX = (
  process.env.NEXTCLOUD_WEBHOOK_PATH_PREFIX || `/${NEXTCLOUD_USER}/files/${PORTFOLIO_DAV_PATH}`
).replace(/\/+$/, "");

export const nextcloudConfigured = () => Boolean(NEXTCLOUD_PASSWORD);

export interface DavEntry {
  /** Path relative to the user's files root, without trailing slash */
  path: string;
  name: string;
  isCollection: boolean;
  contentType: string;
  fileId: number | null;
  etag: string | null;
  size: number | null;
  width: number | null;
  height: number | null;
}

function makeAuth(): string {
  return "Basic " + Buffer.from(`${NEXTCLOUD_USER}:${NEXTCLOUD_PASSWORD}`).toString("base64");
}

function davUrl(relPath: string): string {
  const encoded = relPath.split("/").map(encodeURIComponent).join("/");
  return `${NEXTCLOUD_URL}/remote.php/dav/files/${NEXTCLOUD_USER}/${encoded}`;
}

export function slugify(name: string): string {
  return name
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9\s-]/g, "")
    .trim()
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-");
}

function tag(block: string, name: string): string | null {
  const m = block.match(new RegExp(`<[^>]+:${name}[^>]*>([\\s\\S]*?)</[^>]+:${name}>`));
  return m ? m[1].trim() : null;
}

function int(value: string | null | undefined): number | null {
  const n = value ? parseInt(value, 10) : NaN;
  return Number.isFinite(n) && n > 0 ? n : null;
}

// Extract the path relative to /remote.php/dav/files/<user>/ from a full DAV href
function relativePath(href: string): string {
  const decoded = decodeURIComponent(href);
  const prefix = `/remote.php/dav/files/${NEXTCLOUD_USER}/`;
  const idx = decoded.indexOf(prefix);
  const rel = idx === -1 ? decoded : decoded.slice(idx + prefix.length);
  return rel.replace(/\/$/, "");
}

function parsePropfind(xml: string): DavEntry[] {
  const entries: DavEntry[] = [];
  const responseRe = /<[^>]+:response\b[^>]*>([\s\S]*?)<\/[^>]+:response>/g;
  let m: RegExpExecArray | null;
  while ((m = responseRe.exec(xml)) !== null) {
    const block = m[1];
    const href = tag(block, "href");
    if (!href) continue;
    const path = relativePath(href);
    // Nextcloud photo metadata: <nc:metadata-photos-size><width>…</width><height>…</height>
    const size = tag(block, "metadata-photos-size") ?? "";
    entries.push({
      path,
      name: path.split("/").pop() ?? path,
      isCollection: /<[^>]+:collection\s*\/>/.test(block),
      contentType: (tag(block, "getcontenttype") ?? "").split(";")[0].trim(),
      fileId: int(tag(block, "fileid")),
      etag: tag(block, "getetag")?.replace(/&quot;|"/g, "") ?? null,
      size: int(tag(block, "getcontentlength")),
      width: int(size.match(/<width>(\d+)<\/width>/)?.[1]),
      height: int(size.match(/<height>(\d+)<\/height>/)?.[1]),
    });
  }
  return entries;
}

const PROPFIND_BODY = `<?xml version="1.0"?>
<d:propfind xmlns:d="DAV:" xmlns:oc="http://owncloud.org/ns" xmlns:nc="http://nextcloud.org/ns">
  <d:prop>
    <d:resourcetype/><d:getcontenttype/><d:getetag/><d:getcontentlength/><oc:fileid/>
    <nc:metadata-photos-size/>
  </d:prop>
</d:propfind>`;

/** Lists a folder (depth 1). The first entry is the folder itself. */
export async function listFolder(relPath: string): Promise<DavEntry[]> {
  const res = await fetch(davUrl(relPath), {
    method: "PROPFIND",
    headers: { Authorization: makeAuth(), Depth: "1", "Content-Type": "application/xml" },
    body: PROPFIND_BODY,
    cache: "no-store",
    signal: AbortSignal.timeout(30_000),
  });
  if (res.status === 404) return [];
  if (!res.ok) throw new Error(`PROPFIND ${relPath} failed: ${res.status} ${res.statusText}`);
  return parsePropfind(await res.text());
}

/** Downloads a file. */
export async function downloadFile(relPath: string): Promise<Buffer> {
  const res = await fetch(davUrl(relPath), {
    headers: { Authorization: makeAuth() },
    cache: "no-store",
    signal: AbortSignal.timeout(120_000),
  });
  if (!res.ok) throw new Error(`GET ${relPath} failed: ${res.status} ${res.statusText}`);
  return Buffer.from(await res.arrayBuffer());
}

/** Creates a folder; an existing folder is fine. Throws if the parent is missing or not writable. */
export async function createFolder(relPath: string): Promise<"created" | "exists"> {
  const res = await fetch(davUrl(relPath), {
    method: "MKCOL",
    headers: { Authorization: makeAuth() },
    cache: "no-store",
    signal: AbortSignal.timeout(15_000),
  });
  if (res.status === 201) return "created";
  if (res.status === 405) return "exists";
  if (res.status === 409) throw new Error(`MKCOL ${relPath}: parent folder missing`);
  if (res.status === 403 || res.status === 401) throw new Error(`MKCOL ${relPath}: no write access (${res.status})`);
  throw new Error(`MKCOL ${relPath} failed: ${res.status} ${res.statusText}`);
}

/**
 * Maps a webhook node path to the sync account's view of the portfolio:
 * "" for the portfolio folder itself, "<series>/…" below it, null outside.
 */
export function webhookPathBelowPortfolio(nodePath: string): string | null {
  const path = nodePath.replace(/\/+$/, "");
  if (path === WEBHOOK_PATH_PREFIX) return "";
  return path.startsWith(`${WEBHOOK_PATH_PREFIX}/`) ? path.slice(WEBHOOK_PATH_PREFIX.length + 1) : null;
}
