"use client";

// A shared gallery for guests: justified grid and a fullscreen viewer with
// arrow keys and swipe; a web-size download per photo when the link allows it.
import { useCallback, useEffect, useRef, useState } from "react";
import { useTranslations } from "next-intl";
import { ChevronLeft, ChevronRight, Download, X } from "lucide-react";

export interface GuestPhoto {
  id: number;
  filename: string;
  width: number;
  height: number;
  placeholder: string | null;
  color: string | null;
  src: string;
  srcSet: string;
  large: string;
  download: string | null;
}

const bg = (p: GuestPhoto) =>
  p.placeholder ? { backgroundImage: `url(${p.placeholder})`, backgroundSize: "cover", backgroundColor: p.color ?? undefined } : { backgroundColor: p.color ?? undefined };

export function GuestGallery({ photos }: { photos: GuestPhoto[] }) {
  const t = useTranslations("Portal.guest");
  const [open, setOpen] = useState<number | null>(null);
  const go = useCallback((d: number) => setOpen((i) => (i === null ? i : Math.min(photos.length - 1, Math.max(0, i + d)))), [photos.length]);
  const close = useCallback(() => setOpen(null), []);

  return (
    <>
      <div className="flex flex-wrap gap-1 [--row-h:200px] after:block after:flex-[999_1_0px] after:content-[''] sm:gap-1.5 sm:[--row-h:260px] lg:[--row-h:320px]">
        {photos.map((p, i) => {
          const ratio = p.width / p.height;
          return (
            <button
              key={p.id}
              type="button"
              onClick={() => setOpen(i)}
              aria-label={t("open", { n: i + 1 })}
              className="relative block overflow-hidden"
              style={{ flexGrow: ratio, flexBasis: `calc(${ratio} * var(--row-h))` }}
            >
              <div style={{ paddingBottom: `${100 / ratio}%`, ...bg(p) }} />
              {/* eslint-disable-next-line @next/next/no-img-element -- token-checked /api/share */}
              <img src={p.src} srcSet={p.srcSet} sizes="(max-width: 640px) 50vw, 30vw" alt="" loading={i < 6 ? "eager" : "lazy"} decoding="async" className="absolute inset-0 h-full w-full object-cover" />
            </button>
          );
        })}
      </div>
      {open !== null && <Viewer photos={photos} index={open} go={go} close={close} />}
    </>
  );
}

function Viewer({ photos, index, go, close }: { photos: GuestPhoto[]; index: number; go: (d: number) => void; close: () => void }) {
  const t = useTranslations("Portal.guest");
  const photo = photos[index];
  const touch = useRef<number | null>(null);

  useEffect(() => {
    for (const n of [photos[index + 1], photos[index - 1]]) if (n) new Image().src = n.large;
  }, [index, photos]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") close();
      else if (e.key === "ArrowRight") go(1);
      else if (e.key === "ArrowLeft") go(-1);
    };
    window.addEventListener("keydown", onKey);
    const overflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", onKey);
      document.body.style.overflow = overflow;
    };
  }, [go, close]);

  return (
    <div
      className="fixed inset-0 z-50 flex flex-col bg-neutral-950 text-white"
      role="dialog"
      aria-modal
      aria-label={t("open", { n: index + 1 })}
      onTouchStart={(e) => (touch.current = e.touches[0].clientX)}
      onTouchEnd={(e) => {
        if (touch.current === null) return;
        const dx = e.changedTouches[0].clientX - touch.current;
        if (Math.abs(dx) > 50) go(dx < 0 ? 1 : -1);
        touch.current = null;
      }}
    >
      <div className="flex items-center justify-between gap-3 p-3 sm:p-4">
        <p className="readout text-white/60">
          {String(index + 1).padStart(2, "0")} / {String(photos.length).padStart(2, "0")}
        </p>
        <div className="flex items-center gap-2">
          {photo.download && (
            <a href={photo.download} download className="readout flex items-center gap-1.5 bg-white px-3 py-1.5 text-neutral-900 transition hover:bg-rec hover:text-white">
              <Download className="h-3.5 w-3.5" /> {t("download")}
            </a>
          )}
          <button type="button" onClick={close} className="p-2 text-white/70 hover:text-white" aria-label={t("close")}>
            <X className="h-5 w-5" />
          </button>
        </div>
      </div>
      <div className="relative flex min-h-0 flex-1 items-center justify-center p-2 sm:p-6">
        {/* eslint-disable-next-line @next/next/no-img-element -- token-checked /api/share */}
        <img src={photo.large} alt="" className="h-full w-full select-none object-contain" draggable={false} onContextMenu={photo.download ? undefined : (e) => e.preventDefault()} />
        <button type="button" onClick={() => go(-1)} disabled={index === 0} className="absolute left-2 top-1/2 -translate-y-1/2 p-2 text-white/70 hover:text-white disabled:opacity-20" aria-label={t("previous")}>
          <ChevronLeft className="h-7 w-7" />
        </button>
        <button type="button" onClick={() => go(1)} disabled={index === photos.length - 1} className="absolute right-2 top-1/2 -translate-y-1/2 p-2 text-white/70 hover:text-white disabled:opacity-20" aria-label={t("next")}>
          <ChevronRight className="h-7 w-7" />
        </button>
      </div>
    </div>
  );
}
