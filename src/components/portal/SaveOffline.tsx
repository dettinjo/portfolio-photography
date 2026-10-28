"use client";

// "Save on this phone": keeps a gallery page and one image per photo in the
// device's cache, so it opens without a connection (served by the service
// worker only when the network fails). Nothing is stored unless the client
// asks; removing it, signing out or the gallery's end date clears it.
import { useCallback, useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import { CloudOff, Check } from "lucide-react";
import { OFFLINE_CACHE, canonicalImage, metaKey, type OfflineMeta } from "@/lib/offline";

const CONCURRENCY = 4;

export function SaveOffline({ path, images, title, expiresAt }: { path: string; images: string[]; title: string; expiresAt: string | null }) {
  const t = useTranslations("Portal.offline");
  const [supported, setSupported] = useState(false);
  const [saved, setSaved] = useState<OfflineMeta | null>(null);
  const [progress, setProgress] = useState<{ done: number; total: number } | null>(null);
  const [error, setError] = useState(false);

  const read = useCallback(async () => {
    const cache = await caches.open(OFFLINE_CACHE);
    const meta = await cache.match(metaKey(path));
    setSaved(meta ? ((await meta.json()) as OfflineMeta) : null);
  }, [path]);

  useEffect(() => {
    if (typeof caches === "undefined" || !("serviceWorker" in navigator)) return;
    setSupported(true);
    read().catch(() => {});
  }, [read]);

  async function save() {
    setError(false);
    const keys = images.map((src) => ({ src, key: canonicalImage(new URL(src, location.origin).pathname) })).filter((x): x is { src: string; key: string } => Boolean(x.key));
    setProgress({ done: 0, total: keys.length + 1 });
    try {
      await navigator.storage?.persist?.().catch(() => false);
      const cache = await caches.open(OFFLINE_CACHE);
      const page = await fetch(path, { credentials: "same-origin", headers: { Accept: "text/html" } });
      // A redirect means the session ended: never store the login page as the gallery
      if (!page.ok || page.redirected) throw new Error(String(page.status));
      await cache.put(path, page);
      setProgress({ done: 1, total: keys.length + 1 });
      let next = 0;
      let done = 1;
      const worker = async () => {
        while (next < keys.length) {
          const { src, key } = keys[next++];
          const res = await fetch(src, { credentials: "same-origin" });
          if (!res.ok) throw new Error(String(res.status));
          await cache.put(key, res);
          setProgress({ done: ++done, total: keys.length + 1 });
        }
      };
      await Promise.all(Array.from({ length: CONCURRENCY }, worker));
      const meta: OfflineMeta = { page: path, images: keys.map((k) => k.key), savedAt: new Date().toISOString(), expiresAt, title };
      await cache.put(metaKey(path), new Response(JSON.stringify(meta), { headers: { "Content-Type": "application/json" } }));
      setSaved(meta);
    } catch {
      setError(true);
    } finally {
      setProgress(null);
    }
  }

  async function remove() {
    const cache = await caches.open(OFFLINE_CACHE);
    if (saved) await Promise.all([cache.delete(metaKey(path)), cache.delete(saved.page), ...saved.images.map((i) => cache.delete(i))]);
    setSaved(null);
  }

  if (!supported || !images.length) return null;
  return (
    <div className="mt-6 flex flex-wrap items-center gap-x-4 gap-y-2 border-y border-border py-3">
      {progress ? (
        <span className="readout" role="status">
          {t("saving", { done: progress.done, total: progress.total })}
          <span className="ml-3 inline-block h-1 w-24 bg-muted align-middle">
            <span className="block h-full bg-rec transition-all" style={{ width: `${(progress.done / progress.total) * 100}%` }} />
          </span>
        </span>
      ) : saved ? (
        <>
          <span className="readout flex items-center gap-2">
            <Check className="h-3.5 w-3.5 text-rec" /> {t("saved", { count: saved.images.length })}
          </span>
          <button type="button" onClick={save} className="readout text-muted-foreground hover:text-foreground">
            {t("update")}
          </button>
          <button type="button" onClick={remove} className="readout text-muted-foreground hover:text-rec">
            {t("remove")}
          </button>
        </>
      ) : (
        <>
          <button type="button" onClick={save} className="readout flex items-center gap-2 border border-border px-3 py-2 transition hover:border-foreground">
            <CloudOff className="h-3.5 w-3.5" /> {t("save")}
          </button>
          <span className="text-sm text-muted-foreground">{t("hint", { count: images.length })}</span>
        </>
      )}
      {error && (
        <span role="alert" className="text-sm text-rec">
          {t("error")}
        </span>
      )}
    </div>
  );
}

/** Removes every saved gallery and queued pick from this device (on sign-out). */
export async function clearOfflineData() {
  try {
    if (typeof caches !== "undefined") await caches.delete(OFFLINE_CACHE);
    for (const key of Object.keys(localStorage)) if (key.startsWith("picks-queue:")) localStorage.removeItem(key);
  } catch {
    // Private mode or blocked storage: nothing was saved then either
  }
}
