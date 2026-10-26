// Fetches albums and photos from Nextcloud via WebDAV.
// Images are proxied through /api/nextcloud/photo?path=... so credentials
// never reach the browser.

const NEXTCLOUD_URL = process.env.NEXTCLOUD_URL ?? "https://cloud.joeldettinger.de";
const NEXTCLOUD_USER = process.env.NEXTCLOUD_USER ?? "dettinjo";
const NEXTCLOUD_PASSWORD = process.env.NEXTCLOUD_PASSWORD ?? "";

/** Only files below this folder are ever exposed by the site. */
export const PORTFOLIO_DAV_PATH = "Lightroom/Portfolio";

export interface AlbumImage {
  id: number;
  url: string;
  thumbnailUrl: string;
  filename: string;
  alternativeText: string | null;
  width: number;
  height: number;
  size: null;
}

export interface Album {
  id: number;
  slug: string;
  title: string;
  coverImage: {
    url: string;
    alternativeText: string | null;
    width: number;
    height: number;
    size: null;
  };
  images: AlbumImage[];
  localizations: [];
}

function makeAuth(): string {
  return "Basic " + Buffer.from(`${NEXTCLOUD_USER}:${NEXTCLOUD_PASSWORD}`).toString("base64");
}

function davUrl(relPath: string): string {
  const encoded = relPath.split("/").map(encodeURIComponent).join("/");
  return `${NEXTCLOUD_URL}/remote.php/dav/files/${NEXTCLOUD_USER}/${encoded}`;
}

export function proxyUrl(ncRelPath: string, width?: number): string {
  const w = width ? `&w=${width}` : "";
  return `/api/nextcloud/photo?path=${encodeURIComponent(ncRelPath)}${w}`;
}

export function slugify(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, "")
    .trim()
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-");
}

// Minimal WebDAV PROPFIND XML parser. Handles any XML namespace prefix.
interface DavEntry {
  href: string;
  isCollection: boolean;
  contentType: string;
  fileId: number | null;
  width: number | null;
  height: number | null;
  takenAt: number | null;
}

function tag(block: string, name: string): string | null {
  const m = block.match(new RegExp(`<[^>]+:${name}[^>]*>([\\s\\S]*?)</[^>]+:${name}>`));
  return m ? m[1].trim() : null;
}

function int(value: string | null | undefined): number | null {
  const n = value ? parseInt(value, 10) : NaN;
  return Number.isFinite(n) && n > 0 ? n : null;
}

function parsePropfind(xml: string): DavEntry[] {
  const entries: DavEntry[] = [];
  const responseRe = /<[^>]+:response\b[^>]*>([\s\S]*?)<\/[^>]+:response>/g;
  let m: RegExpExecArray | null;
  while ((m = responseRe.exec(xml)) !== null) {
    const block = m[1];
    const href = tag(block, "href");
    if (!href) continue;
    // Nextcloud photo metadata: <nc:metadata-photos-size><width>…</width><height>…</height>
    const size = tag(block, "metadata-photos-size") ?? "";
    entries.push({
      href: decodeURIComponent(href),
      isCollection: /<[^>]+:collection\s*\/>/.test(block),
      contentType: tag(block, "getcontenttype") ?? "",
      fileId: int(tag(block, "fileid")),
      width: int(size.match(/<width>(\d+)<\/width>/)?.[1]),
      height: int(size.match(/<height>(\d+)<\/height>/)?.[1]),
      takenAt: int(tag(block, "metadata-photos-original_date_time")),
    });
  }
  return entries;
}

const PROPFIND_BODY = `<?xml version="1.0"?>
<d:propfind xmlns:d="DAV:" xmlns:oc="http://owncloud.org/ns" xmlns:nc="http://nextcloud.org/ns">
  <d:prop>
    <d:resourcetype/><d:getcontenttype/><oc:fileid/>
    <nc:metadata-photos-size/><nc:metadata-photos-original_date_time/>
  </d:prop>
</d:propfind>`;

async function propfind(relPath: string): Promise<DavEntry[]> {
  const res = await fetch(davUrl(relPath), {
    method: "PROPFIND",
    headers: {
      Authorization: makeAuth(),
      Depth: "1",
      "Content-Type": "application/xml",
    },
    body: PROPFIND_BODY,
    next: { revalidate: 900 },
  });
  if (!res.ok) {
    console.error(`[nextcloud] PROPFIND ${relPath} failed: ${res.status} ${res.statusText}`);
    return [];
  }
  return parsePropfind(await res.text());
}

// Extract the path relative to /remote.php/dav/files/<user>/ from a full DAV href
function extractFilePath(href: string): string {
  const prefix = `/remote.php/dav/files/${NEXTCLOUD_USER}/`;
  const idx = href.indexOf(prefix);
  if (idx === -1) return href;
  return href.slice(idx + prefix.length).replace(/\/$/, "");
}

const IMAGE_TYPES = new Set(["image/jpeg", "image/jpg", "image/png", "image/webp"]);

// Used until Nextcloud has generated metadata for a newly added file.
const FALLBACK_SIZE = { width: 1600, height: 2000 };

interface AlbumFolder {
  path: string;
  name: string;
  slug: string;
}

/** Album folders directly below the portfolio folder (one PROPFIND). */
async function listAlbumFolders(): Promise<AlbumFolder[]> {
  const entries = await propfind(PORTFOLIO_DAV_PATH);
  return entries
    .filter((e) => e.isCollection)
    .map((e) => extractFilePath(e.href))
    .filter((p) => p !== PORTFOLIO_DAV_PATH)
    .map((path) => {
      const name = path.split("/").filter(Boolean).pop() ?? path;
      return { path, name, slug: slugify(name) };
    })
    .sort((a, b) => a.name.localeCompare(b.name));
}

async function loadAlbum(folder: AlbumFolder, index: number): Promise<Album> {
  const contents = await propfind(folder.path);
  const files = contents
    .filter((e) => !e.isCollection && IMAGE_TYPES.has(e.contentType.split(";")[0].trim()))
    .map((e) => ({ ...e, path: extractFilePath(e.href) }))
    // Capture time first (Lightroom keeps EXIF), filename as a stable tiebreaker
    .sort((a, b) => (a.takenAt ?? 0) - (b.takenAt ?? 0) || a.path.localeCompare(b.path));

  const images: AlbumImage[] = files.map((f, idx) => ({
    id: f.fileId ?? idx + 1,
    // 1920px for full-screen lightbox; cached separately from the 800px thumbnail
    url: proxyUrl(f.path, 1920),
    thumbnailUrl: proxyUrl(f.path, 800),
    filename: f.path.split("/").pop() ?? f.path,
    alternativeText: null,
    width: f.width ?? FALLBACK_SIZE.width,
    height: f.height ?? FALLBACK_SIZE.height,
    size: null,
  }));

  const cover = images[0];
  return {
    id: index + 1,
    slug: folder.slug,
    title: folder.name,
    coverImage: {
      url: cover ? cover.thumbnailUrl : "/placeholder.jpg",
      alternativeText: `Cover photo for ${folder.name}`,
      width: cover?.width ?? FALLBACK_SIZE.width,
      height: cover?.height ?? FALLBACK_SIZE.height,
      size: null,
    },
    images,
    localizations: [],
  };
}

export async function fetchAlbums(): Promise<Album[]> {
  if (!NEXTCLOUD_PASSWORD) return [];
  const folders = await listAlbumFolders();
  return Promise.all(folders.map((f, i) => loadAlbum(f, i)));
}

export async function fetchAlbumBySlug(slug: string): Promise<Album | null> {
  if (!NEXTCLOUD_PASSWORD) return null;
  const folders = await listAlbumFolders();
  const index = folders.findIndex((f) => f.slug === slug);
  return index === -1 ? null : loadAlbum(folders[index], index);
}

export async function fetchAllAlbumSlugs(): Promise<{ slug: string }[]> {
  if (!NEXTCLOUD_PASSWORD) return [];
  return (await listAlbumFolders()).map((f) => ({ slug: f.slug }));
}
