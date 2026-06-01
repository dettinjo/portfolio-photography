// Payload CMS client — replaces the old Strapi client.
// All public data is fetched from NEXT_PUBLIC_CMS_URL (the payload-cms service).
// The shape of Album, Testimonial, etc. is kept identical so page components
// need no changes.

// --------------------------------------------------------------------------
// Types
// --------------------------------------------------------------------------

export interface MediaImage {
  id: number | string;
  url: string;
  alternativeText: string | null;
  width: number;
  height: number;
  size: number | null;
}

export interface Album {
  id: number | string;
  slug: string;
  title: string;
  coverImage: MediaImage | null;
  images: MediaImage[];
  approvalToken?: string;
  clientName?: string;
  clientEmail?: string;
  approvalStatus?: "pending" | "notified" | "submitted" | "approved";
  selections?: { filename: string; comment?: string }[];
  selectionMin?: number;
  selectionMax?: number;
  allowDownloads?: boolean;
  approvalTerms?: string;
  published?: boolean;
}

export interface Testimonial {
  id: number | string;
  quote: string;
  name: string;
  role: string;
  avatar: MediaImage | null;
  communication: number;
  creativity: number;
  professionalism: number;
  value: number;
  approved: boolean;
}

// --------------------------------------------------------------------------
// Config
// --------------------------------------------------------------------------

// Payload is embedded — REST API is at the same origin
const CMS_URL = "";

// Resolve a Payload media URL to an absolute URL.
export function getCmsMedia(url: string | undefined | null): string | null {
  if (!url) return null;
  if (url.startsWith("http")) return url;
  return `${CMS_URL}${url}`;
}

// Legacy alias kept so existing callers of getStrapiMedia() still compile.
export const getStrapiMedia = getCmsMedia;

// --------------------------------------------------------------------------
// Internal helpers
// --------------------------------------------------------------------------

function normaliseMedia(m: Record<string, unknown> | null | undefined): MediaImage | null {
  if (!m) return null;
  return {
    id: m.id as number,
    url: getCmsMedia(m.url as string) ?? "",
    alternativeText: (m.alt as string) ?? null,
    width: m.width as number,
    height: m.height as number,
    size: m.filesize as number ?? null,
  };
}

function normaliseAlbum(doc: Record<string, unknown>): Album {
  return {
    id: doc.id as number,
    slug: doc.slug as string,
    title: doc.title as string,
    coverImage: normaliseMedia(doc.coverImage as Record<string, unknown> | null),
    images: [], // albums don't carry images in the list view
    approvalToken: doc.approvalToken as string | undefined,
    clientName: doc.clientName as string | undefined,
    clientEmail: doc.clientEmail as string | undefined,
    approvalStatus: doc.approvalStatus as Album["approvalStatus"],
    selections: doc.selections as Album["selections"],
    selectionMin: doc.selectionMin as number | undefined,
    selectionMax: doc.selectionMax as number | undefined,
    allowDownloads: doc.allowDownloads as boolean | undefined,
    approvalTerms: doc.approvalTerms as string | undefined,
    published: doc.published as boolean | undefined,
  };
}

async function payloadFetch<T>(path: string, options?: RequestInit): Promise<T> {
  const url = `${CMS_URL}/api${path}`;
  const res = await fetch(url, {
    headers: { "Content-Type": "application/json" },
    ...options,
  });
  if (!res.ok) {
    console.error(`Payload CMS fetch error ${res.status}: ${url}`);
    throw new Error("CMS request failed");
  }
  const json = await res.json();
  return json as T;
}

// --------------------------------------------------------------------------
// Public API
// --------------------------------------------------------------------------

export async function fetchAlbums(): Promise<Album[]> {
  const data = await payloadFetch<{ docs: Record<string, unknown>[] }>(
    "/albums?where[published][equals]=true&depth=1&limit=100"
  );
  return (data.docs ?? []).map(normaliseAlbum);
}

export async function fetchAllAlbumSlugs(): Promise<{ slug: string }[]> {
  const data = await payloadFetch<{ docs: { slug: string }[] }>(
    "/albums?where[published][equals]=true&depth=0&limit=200&select[slug]=true"
  );
  return (data.docs ?? []).map((d) => ({ slug: d.slug }));
}

export async function fetchAlbumBySlug(slug: string): Promise<Album | null> {
  const data = await payloadFetch<{ docs: Record<string, unknown>[] }>(
    `/albums?where[slug][equals]=${encodeURIComponent(slug)}&depth=2&limit=1`
  );
  const doc = data.docs?.[0];
  if (!doc) return null;

  const album = normaliseAlbum(doc);
  // Attach full image list from the 'images' relation
  const rawImages = (doc.images as Record<string, unknown>[] | undefined) ?? [];
  album.images = rawImages.map((img) => normaliseMedia(img)!).filter(Boolean);
  return album;
}

export async function fetchTestimonials(): Promise<Testimonial[]> {
  const data = await payloadFetch<{ docs: Record<string, unknown>[] }>(
    "/reviews?where[approved][equals]=true&depth=1&limit=100"
  );
  return (data.docs ?? []).map((doc) => ({
    id: doc.id as number,
    quote: doc.quote as string,
    name: doc.name as string,
    role: (doc.role as string) ?? "",
    avatar: normaliseMedia(doc.avatar as Record<string, unknown> | null),
    communication: (doc.communication as number) ?? 5,
    creativity: (doc.creativity as number) ?? 5,
    professionalism: (doc.professionalism as number) ?? 5,
    value: (doc.value as number) ?? 5,
    approved: true,
  }));
}

// --------------------------------------------------------------------------
// Authenticated API (admin-only, for approval flow)
// --------------------------------------------------------------------------

export async function fetchAuthenticatedAPI<T>(
  path: string,
  _urlParamsObject = {},
  options: RequestInit = {},
  token: string
): Promise<T> {
  const url = `${CMS_URL}/api${path}`;
  const res = await fetch(url, {
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    ...options,
  });
  if (!res.ok) {
    console.error(`Payload authenticated fetch error ${res.status}: ${url}`);
    throw new Error("CMS request failed");
  }
  const json = await res.json();
  return (json.doc ?? json.data ?? json) as T;
}
