// Fetches albums and photos from Nextcloud via WebDAV.
// Images are proxied through /api/nextcloud/photo?path=... so credentials
// never reach the browser.

const NEXTCLOUD_URL = process.env.NEXTCLOUD_URL ?? "https://cloud.joeldettinger.de";
const NEXTCLOUD_USER = process.env.NEXTCLOUD_USER ?? "dettinjo";
const NEXTCLOUD_PASSWORD = process.env.NEXTCLOUD_PASSWORD ?? "";
const PORTFOLIO_DAV_PATH = `Lightroom/Portfolio`;

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
  images: Array<{
    id: number;
    url: string;
    alternativeText: string | null;
    width: number;
    height: number;
    size: null;
  }>;
  localizations: [];
}

function makeAuth(): string {
  return "Basic " + Buffer.from(`${NEXTCLOUD_USER}:${NEXTCLOUD_PASSWORD}`).toString("base64");
}

function davUrl(relPath: string): string {
  const encoded = relPath.split("/").map(encodeURIComponent).join("/");
  return `${NEXTCLOUD_URL}/remote.php/dav/files/${NEXTCLOUD_USER}/${encoded}`;
}

export function proxyUrl(ncRelPath: string): string {
  return `/api/nextcloud/photo?path=${encodeURIComponent(ncRelPath)}`;
}

export function slugify(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, "")
    .trim()
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-");
}

// Minimal WebDAV PROPFIND XML parser — extracts hrefs, collection flag, and content-type.
// Handles any XML namespace prefix.
interface DavEntry {
  href: string;
  isCollection: boolean;
  contentType: string;
}

function parsePropfind(xml: string): DavEntry[] {
  const entries: DavEntry[] = [];
  // Each <...:response> block describes one resource
  const responseRe = /<[^>]+:response\b[^>]*>([\s\S]*?)<\/[^>]+:response>/g;
  let m: RegExpExecArray | null;
  while ((m = responseRe.exec(xml)) !== null) {
    const block = m[1];
    const hrefM = block.match(/<[^>]+:href[^>]*>([^<]+)<\/[^>]+:href>/);
    if (!hrefM) continue;
    const href = decodeURIComponent(hrefM[1].trim());
    const isCollection = /<[^>]+:collection\s*\/>/.test(block);
    const ctM = block.match(/<[^>]+:getcontenttype[^>]*>([^<]+)<\/[^>]+:getcontenttype>/);
    const contentType = ctM ? ctM[1].trim() : "";
    entries.push({ href, isCollection, contentType });
  }
  return entries;
}

async function propfind(relPath: string, depth = 1): Promise<DavEntry[]> {
  const url = davUrl(relPath);
  const res = await fetch(url, {
    method: "PROPFIND",
    headers: {
      Authorization: makeAuth(),
      Depth: String(depth),
      "Content-Type": "application/xml",
    },
    body: `<?xml version="1.0"?><d:propfind xmlns:d="DAV:"><d:prop><d:resourcetype/><d:getcontenttype/></d:prop></d:propfind>`,
    next: { revalidate: 900 },
  });
  if (!res.ok) {
    console.error(`[nextcloud] PROPFIND ${relPath} failed: ${res.status} ${res.statusText}`);
    return [];
  }
  const xml = await res.text();
  return parsePropfind(xml);
}

// Extract the path relative to /remote.php/dav/files/<user>/ from a full DAV href
function extractFilePath(href: string): string {
  const prefix = `/remote.php/dav/files/${NEXTCLOUD_USER}/`;
  const idx = href.indexOf(prefix);
  if (idx === -1) return href;
  return decodeURIComponent(href.slice(idx + prefix.length).replace(/\/$/, ""));
}

const IMAGE_TYPES = new Set(["image/jpeg", "image/jpg", "image/png", "image/webp"]);

export async function fetchAlbums(): Promise<Album[]> {
  if (!NEXTCLOUD_PASSWORD) return [];

  const entries = await propfind(PORTFOLIO_DAV_PATH, 1);
  const portfolioHref = `/remote.php/dav/files/${NEXTCLOUD_USER}/${PORTFOLIO_DAV_PATH}`;

  const albumFolders = entries.filter(
    (e) => e.isCollection && !e.href.replace(/\/$/, "").endsWith(PORTFOLIO_DAV_PATH) && e.href !== portfolioHref + "/"
  );

  const albums: Album[] = [];
  for (let i = 0; i < albumFolders.length; i++) {
    const folder = albumFolders[i];
    const folderPath = extractFilePath(folder.href);
    const folderName = folderPath.split("/").filter(Boolean).pop() ?? folderPath;

    // Fetch album contents to find the cover image
    const contents = await propfind(folderPath, 1);
    const images = contents
      .filter((e) => !e.isCollection && IMAGE_TYPES.has(e.contentType.split(";")[0].trim()))
      .map((e) => extractFilePath(e.href))
      .sort();

    const coverPath = images[0] ?? null;

    albums.push({
      id: i + 1,
      slug: slugify(folderName),
      title: folderName,
      coverImage: {
        url: coverPath ? proxyUrl(coverPath) : "/placeholder.jpg",
        alternativeText: `Cover photo for ${folderName}`,
        width: 800,
        height: 533,
        size: null,
      },
      images: images.map((imgPath, idx) => ({
        id: idx + 1,
        url: proxyUrl(imgPath),
        alternativeText: null,
        width: 1200,
        height: 800,
        size: null,
      })),
      localizations: [],
    });
  }

  return albums;
}

export async function fetchAlbumBySlug(slug: string): Promise<Album | null> {
  const albums = await fetchAlbums();
  return albums.find((a) => a.slug === slug) ?? null;
}

export async function fetchAllAlbumSlugs(): Promise<{ slug: string }[]> {
  const albums = await fetchAlbums();
  return albums.map((a) => ({ slug: a.slug }));
}
