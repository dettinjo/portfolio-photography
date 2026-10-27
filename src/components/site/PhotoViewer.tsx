"use client";

// Fullscreen viewer: keyboard (← → Esc i), swipe, info panel, and the URL
// follows the current photo (/p/<id>) so every view can be shared.
import { useCallback, useEffect, useRef, useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import { ChevronLeft, ChevronRight, Info, Share2, X } from "lucide-react";
import type { PhotoView } from "@/lib/photo-view";
import { exposureLine } from "@/lib/photo-view";
import { cn } from "@/lib/utils";

interface PhotoViewerProps {
  photos: PhotoView[];
  index: number;
  onIndexChange: (index: number) => void;
  onClose: () => void;
}

export const photoPrefix = (locale: string) => `${locale === "de" ? "/de" : ""}/p/`;
export const photoPath = (locale: string, id: number) => `${photoPrefix(locale)}${id}`;
export const seriesPath = (locale: string, slug: string) => `${locale === "de" ? "/de" : ""}/work/${slug}`;

export function PhotoViewer({ photos, index, onIndexChange, onClose }: PhotoViewerProps) {
  const t = useTranslations("Site.viewer");
  const locale = useLocale();
  const photo = photos[index];
  const [showInfo, setShowInfo] = useState(false);
  const [loaded, setLoaded] = useState(false);
  const [copied, setCopied] = useState(false);
  const touchStart = useRef<{ x: number; y: number } | null>(null);
  const returnUrl = useRef<string | null>(null);

  const go = useCallback(
    (delta: number) => {
      const next = index + delta;
      if (next >= 0 && next < photos.length) onIndexChange(next);
    },
    [index, photos.length, onIndexChange],
  );

  // URL follows the photo; restore the previous URL on close
  useEffect(() => {
    if (returnUrl.current === null) returnUrl.current = window.location.pathname + window.location.search;
    window.history.replaceState(window.history.state, "", photoPath(locale, photo.id));
  }, [photo.id, locale]);

  const close = useCallback(() => {
    if (returnUrl.current) window.history.replaceState(window.history.state, "", returnUrl.current);
    onClose();
  }, [onClose]);

  useEffect(() => {
    setLoaded(false);
    // Preload neighbours so paging feels instant
    for (const n of [photos[index + 1], photos[index - 1]]) if (n) new Image().src = n.large;
  }, [index, photos]);

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") close();
      else if (event.key === "ArrowRight") go(1);
      else if (event.key === "ArrowLeft") go(-1);
      else if (event.key.toLowerCase() === "i") setShowInfo((v) => !v);
    };
    window.addEventListener("keydown", onKey);
    const overflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", onKey);
      document.body.style.overflow = overflow;
    };
  }, [go, close]);

  const share = async () => {
    const url = window.location.origin + photoPath(locale, photo.id);
    try {
      if (navigator.share) await navigator.share({ title: photo.title ?? photo.seriesTitle ?? undefined, url });
      else {
        await navigator.clipboard.writeText(url);
        setCopied(true);
        setTimeout(() => setCopied(false), 1800);
      }
    } catch {
      /* share dialog dismissed */
    }
  };

  const exposure = exposureLine(photo);
  const date = photo.takenAt
    ? new Intl.DateTimeFormat(locale, { year: "numeric", month: "long", day: "numeric" }).format(new Date(photo.takenAt))
    : null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label={photo.alt}
      className="fixed inset-0 z-[60] flex bg-black text-white"
      onTouchStart={(e) => (touchStart.current = { x: e.touches[0].clientX, y: e.touches[0].clientY })}
      onTouchEnd={(e) => {
        const start = touchStart.current;
        touchStart.current = null;
        if (!start || e.touches.length > 0) return;
        const dx = e.changedTouches[0].clientX - start.x;
        const dy = e.changedTouches[0].clientY - start.y;
        if (Math.abs(dx) > 50 && Math.abs(dx) > Math.abs(dy) * 1.5) go(dx < 0 ? 1 : -1);
        else if (dy > 90 && Math.abs(dy) > Math.abs(dx) * 1.5) close();
      }}
    >
      <div className="relative flex min-w-0 flex-1 items-center justify-center">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          key={photo.id}
          src={photo.large}
          alt={photo.alt}
          onLoad={() => setLoaded(true)}
          className={cn(
            "max-h-[100svh] max-w-full select-none object-contain",
            loaded ? "shutter" : "opacity-0",
          )}
          style={{ aspectRatio: `${photo.width} / ${photo.height}` }}
          draggable={false}
        />
        {!loaded && photo.placeholder && (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={photo.placeholder}
            alt=""
            aria-hidden
            className="absolute max-h-[100svh] max-w-full object-contain blur-xl"
            style={{ aspectRatio: `${photo.width} / ${photo.height}` }}
          />
        )}

        <div className="pointer-events-none absolute inset-x-0 top-0 flex items-center justify-between bg-gradient-to-b from-black/60 to-transparent p-3 sm:p-4">
          <span className="readout pointer-events-auto flex items-center gap-2 text-white/80">
            <span className="rec-dot" aria-hidden />
            {String(index + 1).padStart(3, "0")} / {String(photos.length).padStart(3, "0")}
          </span>
          <div className="pointer-events-auto flex items-center gap-1">
            <ViewerButton label={copied ? t("copied") : t("share")} onClick={share}>
              <Share2 className="h-5 w-5" />
            </ViewerButton>
            <ViewerButton label={t("info")} onClick={() => setShowInfo((v) => !v)} active={showInfo}>
              <Info className="h-5 w-5" />
            </ViewerButton>
            <ViewerButton label={t("close")} onClick={close}>
              <X className="h-6 w-6" />
            </ViewerButton>
          </div>
        </div>

        {index > 0 && (
          <ViewerButton label={t("previous")} onClick={() => go(-1)} className="absolute left-2 top-1/2 hidden -translate-y-1/2 sm:flex">
            <ChevronLeft className="h-8 w-8" />
          </ViewerButton>
        )}
        {index < photos.length - 1 && (
          <ViewerButton label={t("next")} onClick={() => go(1)} className="absolute right-2 top-1/2 hidden -translate-y-1/2 sm:flex">
            <ChevronRight className="h-8 w-8" />
          </ViewerButton>
        )}
      </div>

      {showInfo && (
        <aside className="absolute inset-x-0 bottom-0 max-h-[50svh] overflow-y-auto border-t border-white/10 bg-black/90 p-5 backdrop-blur sm:static sm:max-h-none sm:w-80 sm:border-l sm:border-t-0 sm:bg-neutral-950">
          {photo.title && <h2 className="display text-4xl">{photo.title}</h2>}
          {photo.caption && <p className="mt-2 text-sm leading-relaxed text-white/75">{photo.caption}</p>}
          <dl className="mt-4 space-y-3 text-sm">
            {photo.seriesSlug && photo.seriesTitle && (
              <InfoRow label={t("series")}>
                <a href={seriesPath(locale, photo.seriesSlug)} className="underline underline-offset-4 hover:text-white">
                  {photo.seriesTitle}
                </a>
              </InfoRow>
            )}
            {date && <InfoRow label={t("date")}>{date}</InfoRow>}
            {photo.camera && <InfoRow label={t("camera")}>{photo.camera}</InfoRow>}
            {photo.lens && <InfoRow label={t("lens")}>{photo.lens}</InfoRow>}
            {exposure && <InfoRow label={t("settings")}>{exposure}</InfoRow>}
          </dl>
          <a
            href={
              photo.genre
                ? `${locale === "de" ? "/de" : ""}/sessions?genre=${photo.genre}&photo=${photo.id}#plan`
                : `${locale === "de" ? "/de" : ""}/contact?photo=${photo.id}`
            }
            className="mt-6 inline-block bg-white px-4 py-2 text-sm text-black transition hover:bg-rec hover:text-white"
          >
            {t("bookSimilar")}
          </a>
        </aside>
      )}
    </div>
  );
}

function ViewerButton({
  label,
  onClick,
  children,
  className,
  active,
}: {
  label: string;
  onClick: () => void;
  children: React.ReactNode;
  className?: string;
  active?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={label}
      title={label}
      className={cn(
        "flex h-11 w-11 items-center justify-center rounded-full text-white/80 transition hover:bg-white/10 hover:text-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-white",
        active && "bg-white/15 text-white",
        className,
      )}
    >
      {children}
    </button>
  );
}

function InfoRow({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <dt className="readout text-white/45">{label}</dt>
      <dd className="mt-1 text-white/90">{children}</dd>
    </div>
  );
}
