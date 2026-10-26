/// <reference lib="esnext" />
/// <reference lib="webworker" />
// Service worker (built by @serwist/next into public/sw.js).
// Only public, non-personal things are cached on the device:
// - the app shell (Next.js static assets, precached at build)
// - photos (immutable URLs, cache-first)
// - public pages (network-first, so content stays fresh; used when offline)
// Admin, API responses and client approval pages are never cached.
import type { PrecacheEntry, SerwistGlobalConfig } from "serwist";
import { CacheFirst, ExpirationPlugin, NetworkFirst, Serwist } from "serwist";

declare global {
  interface WorkerGlobalScope extends SerwistGlobalConfig {
    __SW_MANIFEST: (PrecacheEntry | string)[] | undefined;
  }
}

declare const self: ServiceWorkerGlobalScope;

const PRIVATE_PATHS = /^\/(?:(?:en|de)\/)?(?:admin|api|approve|dashboard)(?:\/|$)/;

const serwist = new Serwist({
  precacheEntries: self.__SW_MANIFEST,
  skipWaiting: true,
  clientsClaim: true,
  navigationPreload: true,
  runtimeCaching: [
    {
      matcher: ({ url, sameOrigin }) => sameOrigin && url.pathname.startsWith("/api/photos/"),
      handler: new CacheFirst({
        cacheName: "photos",
        plugins: [new ExpirationPlugin({ maxEntries: 400, maxAgeSeconds: 30 * 24 * 60 * 60 })],
      }),
    },
    {
      matcher: ({ request, url, sameOrigin }) =>
        sameOrigin && request.mode === "navigate" && !PRIVATE_PATHS.test(url.pathname),
      handler: new NetworkFirst({
        cacheName: "pages",
        networkTimeoutSeconds: 4,
        // Next.js varies pages on router/RSC headers; this cache only holds full
        // page loads, so match on the URL alone.
        matchOptions: { ignoreVary: true },
        plugins: [new ExpirationPlugin({ maxEntries: 40, maxAgeSeconds: 7 * 24 * 60 * 60 })],
      }),
    },
  ],
  fallbacks: {
    entries: [
      {
        url: "/de/offline",
        matcher: ({ request }) =>
          request.destination === "document" && /^\/de(\/|$)/.test(new URL(request.url).pathname),
      },
      {
        url: "/offline",
        matcher: ({ request }) => request.destination === "document",
      },
    ],
  },
});

serwist.addEventListeners();
