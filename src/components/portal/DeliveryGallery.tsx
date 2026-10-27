"use client";

// The delivered photos: justified grid, a viewer with arrow keys, and a
// download for every photo (full resolution or web size).
import { useCallback, useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import { ChevronLeft, ChevronRight, Download, X } from "lucide-react";
import type { DeliveredPhoto } from "@/lib/portal";

const bg = (p: DeliveredPhoto) =>
  p.placeholder ? { backgroundImage: `url(${p.placeholder})`, backgroundSize: "cover", backgroundColor: p.color ?? undefined } : { backgroundColor: p.color ?? undefined };

export function DeliveryGallery({ photos }: { photos: DeliveredPhoto[] }) {
  const t = useTranslations("Portal.delivery");
  const [open, setOpen] = useState<number | null>(null);
  const go = useCallback((d: number) => setOpen((i) => (i === null ? i : Math.min(photos.length - 1, Math.max(0, i + d)))), [photos.length]);

  useEffect(() => {
    if (open === null) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(null);
      else if (e.key === "ArrowRight") go(1);
      else if (e.key === "ArrowLeft") go(-1);
    };
    window.addEventListener("keydown", onKey);
    const overflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    for (const n of [photos[open + 1], photos[open - 1]]) if (n) new Image().src = n.large;
    return () => {
      window.removeEventListener("keydown", onKey);
      document.body.style.overflow = overflow;
    };
  }, [open, go, photos]);

  const photo = open !== null ? photos[open] : null;
  return (
    <>
      <div className="flex flex-wrap gap-1 [--row-h:200px] after:block after:flex-[999_1_0px] after:content-[''] sm:gap-1.5 sm:[--row-h:260px] lg:[--row-h:320px]">
        {photos.map((p, i) => {
          const ratio = p.width / p.height;
          return (
            <div key={p.id} className="group relative" style={{ flexGrow: ratio, flexBasis: `calc(${ratio} * var(--row-h))` }}>
              <button type="button" onClick={() => setOpen(i)} className="relative block w-full overflow-hidden" aria-label={p.filename}>
                <div style={{ paddingBottom: `${100 / ratio}%`, ...bg(p) }} />
                {/* eslint-disable-next-line @next/next/no-img-element -- access-checked /api/previews */}
                <img src={p.src} srcSet={p.srcSet} sizes="(max-width: 640px) 50vw, 30vw" alt={p.filename} loading={i < 6 ? "eager" : "lazy"} decoding="async" className="absolute inset-0 h-full w-full object-cover" />
              </button>
              <a
                href={p.original}
                download
                aria-label={`${t("original")}: ${p.filename}`}
                className="absolute right-2 top-2 grid h-9 w-9 place-items-center rounded-full bg-white/90 text-neutral-900 opacity-0 shadow transition hover:bg-rec hover:text-white focus:opacity-100 group-hover:opacity-100"
              >
                <Download className="h-4 w-4" />
              </a>
            </div>
          );
        })}
      </div>

      {photo && open !== null && (
        <div className="fixed inset-0 z-50 flex flex-col bg-neutral-950 text-white" role="dialog" aria-modal aria-label={photo.filename}>
          <div className="flex items-center justify-between gap-3 p-3">
            <p className="readout min-w-0 truncate text-white/60">
              {String(open + 1).padStart(2, "0")} / {String(photos.length).padStart(2, "0")} · {photo.filename}
            </p>
            <div className="flex items-center gap-2">
              <a href={photo.original} download className="readout flex items-center gap-1.5 bg-white px-3 py-1.5 text-neutral-900 transition hover:bg-rec hover:text-white">
                <Download className="h-3.5 w-3.5" /> {t("original")}
              </a>
              <a href={photo.web} download className="readout hidden items-center gap-1.5 border border-white/40 px-3 py-1.5 transition hover:border-white sm:flex">
                {t("web")}
              </a>
              <button type="button" onClick={() => setOpen(null)} className="p-2 text-white/70 hover:text-white" aria-label={t("close")}>
                <X className="h-5 w-5" />
              </button>
            </div>
          </div>
          <div className="relative flex min-h-0 flex-1 items-center justify-center p-2 sm:p-6">
            {/* eslint-disable-next-line @next/next/no-img-element -- access-checked /api/previews */}
            <img src={photo.large} alt={photo.filename} className="max-h-full max-w-full object-contain" />
            <button type="button" onClick={() => go(-1)} disabled={open === 0} className="absolute left-2 top-1/2 -translate-y-1/2 p-2 text-white/70 hover:text-white disabled:opacity-20" aria-label={t("previous")}>
              <ChevronLeft className="h-7 w-7" />
            </button>
            <button type="button" onClick={() => go(1)} disabled={open === photos.length - 1} className="absolute right-2 top-1/2 -translate-y-1/2 p-2 text-white/70 hover:text-white disabled:opacity-20" aria-label={t("next")}>
              <ChevronRight className="h-7 w-7" />
            </button>
          </div>
        </div>
      )}
    </>
  );
}
