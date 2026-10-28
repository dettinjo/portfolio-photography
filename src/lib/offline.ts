// Galleries saved on the device for offline viewing (Phase 5d). Shared by the
// page (saving, removing) and the service worker (serving when offline), so
// keep it free of DOM- and server-only code.
//
// Only what a client explicitly saves is stored: the gallery page and one
// image per photo under a canonical key, plus a small meta entry with the
// gallery's end date. Signing out removes everything.

export const OFFLINE_CACHE = "offline-galleries";

/** Any width of a private image → one key per photo version. */
export function canonicalImage(pathname: string): string | null {
  const m = /^\/api\/previews\/(\d+)\/([a-z0-9]+)\/\d+$/.exec(pathname);
  return m ? `/api/previews/${m[1]}/${m[2]}/offline` : null;
}

/** Where the meta entry of a saved page lives in the cache. */
export const metaKey = (pagePath: string) => `/__offline${pagePath}`;

export interface OfflineMeta {
  page: string;
  images: string[];
  savedAt: string;
  /** After this the copy is no longer served and gets removed */
  expiresAt: string | null;
  title: string;
}
