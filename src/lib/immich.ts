// src/lib/immich.ts
// Fetches albums and photos from Immich. Images are served through a local
// Next.js proxy route (/api/immich/[assetId]/[size]) so the API key never
// reaches the browser.

import type { Album, StrapiImage } from "./strapi";

const IMMICH_URL = process.env.IMMICH_URL ?? "";
const IMMICH_API_KEY = process.env.IMMICH_API_KEY ?? "";

// --------------------------------------------------------------------------
// Immich API shapes (subset of what the API actually returns)
// --------------------------------------------------------------------------

interface ImmichAlbum {
  id: string;
  albumName: string;
  albumThumbnailAssetId: string | null;
  assetCount: number;
}

interface ImmichAsset {
  id: string;
  type: "IMAGE" | "VIDEO";
  exifInfo?: {
    exifImageWidth: number | null;
    exifImageHeight: number | null;
    description: string | null;
  };
}

interface ImmichAlbumDetail extends ImmichAlbum {
  assets: ImmichAsset[];
}

// --------------------------------------------------------------------------
// Helpers
// --------------------------------------------------------------------------

/** Converts an album name to a URL slug, e.g. "Summer Wedding" → "summer-wedding" */
export function slugify(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, "")
    .trim()
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-");
}

/** Returns the local proxy URL for an Immich asset thumbnail. */
function thumbnailUrl(assetId: string): string {
  return `/api/immich/${assetId}/thumbnail`;
}

function makeHeaders() {
  return { "x-api-key": IMMICH_API_KEY };
}

// --------------------------------------------------------------------------
// Public API — mirrors the shape of strapi.ts exports
// --------------------------------------------------------------------------

export async function fetchAlbums(): Promise<Album[]> {
  if (!IMMICH_URL || !IMMICH_API_KEY) return [];

  const res = await fetch(`${IMMICH_URL}/api/albums`, {
    headers: makeHeaders(),
    next: { revalidate: 900 }, // 15-min ISR cache
  });

  if (!res.ok) {
    console.error("[immich] fetchAlbums failed:", res.status, res.statusText);
    return [];
  }

  const data: ImmichAlbum[] = await res.json();

  return data.map((album, index) => {
    const cover: StrapiImage = {
      id: index + 1,
      url: album.albumThumbnailAssetId
        ? thumbnailUrl(album.albumThumbnailAssetId)
        : "/placeholder.jpg",
      alternativeText: `Cover photo for ${album.albumName}`,
      width: 800,
      height: 533,
      size: null,
    };

    return {
      id: index + 1,
      slug: slugify(album.albumName),
      title: album.albumName,
      coverImage: cover,
      images: [],
      localizations: [],
    };
  });
}

export async function fetchAlbumBySlug(slug: string): Promise<Album | null> {
  if (!IMMICH_URL || !IMMICH_API_KEY) return null;

  // Fetch album list to resolve slug → Immich UUID
  const res = await fetch(`${IMMICH_URL}/api/albums`, {
    headers: makeHeaders(),
    next: { revalidate: 900 },
  });
  if (!res.ok) return null;

  const all: ImmichAlbum[] = await res.json();
  const raw = all.find((a) => slugify(a.albumName) === slug);
  if (!raw) return null;

  // Fetch full album with assets
  const detailRes = await fetch(`${IMMICH_URL}/api/albums/${raw.id}`, {
    headers: makeHeaders(),
    next: { revalidate: 900 },
  });
  if (!detailRes.ok) return null;

  const detail: ImmichAlbumDetail = await detailRes.json();
  const index = all.indexOf(raw);

  const images: StrapiImage[] = detail.assets
    .filter((a) => a.type === "IMAGE")
    .map((asset, idx) => ({
      id: idx + 1,
      url: thumbnailUrl(asset.id),
      alternativeText: null,
      width: asset.exifInfo?.exifImageWidth ?? 1200,
      height: asset.exifInfo?.exifImageHeight ?? 800,
      size: null,
    }));

  return {
    id: index + 1,
    slug: slugify(detail.albumName),
    title: detail.albumName,
    coverImage: {
      id: 0,
      url: detail.albumThumbnailAssetId
        ? thumbnailUrl(detail.albumThumbnailAssetId)
        : "/placeholder.jpg",
      alternativeText: `Cover photo for ${detail.albumName}`,
      width: 800,
      height: 533,
      size: null,
    },
    images,
    localizations: [],
  };
}

export async function fetchAllAlbumSlugs(): Promise<{ slug: string }[]> {
  const albums = await fetchAlbums();
  return albums.map((a) => ({ slug: a.slug }));
}
