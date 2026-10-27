"use client";

// A justified stream of photos with optional genre filter; clicking a photo
// opens the fullscreen viewer.
import { useMemo, useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import type { PhotoView } from "@/lib/photo-view";
import { cn } from "@/lib/utils";
import { JustifiedGrid } from "./JustifiedGrid";
import { PhotoViewer, photoPrefix } from "./PhotoViewer";

interface PhotoStreamProps {
  photos: PhotoView[];
  genres?: { slug: string; name: string }[];
  eager?: number;
}

export function PhotoStream({ photos, genres = [], eager = 6 }: PhotoStreamProps) {
  const t = useTranslations("Site.stream");
  const locale = useLocale();
  const [genre, setGenre] = useState<string | null>(null);
  const [open, setOpen] = useState<number | null>(null);

  const visible = useMemo(() => (genre ? photos.filter((p) => p.genre === genre) : photos), [photos, genre]);

  return (
    <>
      {genres.length > 1 && (
        <div role="tablist" aria-label={t("filter")} className="readout mb-5 flex flex-wrap gap-x-5 gap-y-2 px-1">
          {[{ slug: null, name: t("all") }, ...genres].map((g) => (
            <button
              key={g.slug ?? "all"}
              role="tab"
              aria-selected={genre === g.slug}
              onClick={() => setGenre(g.slug)}
              className={cn(
                "flex items-center gap-2 py-1 transition-colors",
                genre === g.slug ? "text-foreground" : "text-muted-foreground hover:text-foreground",
              )}
            >
              <span
                aria-hidden
                className={cn("h-1.5 w-1.5 rounded-full", genre === g.slug ? "bg-rec" : "bg-current opacity-30")}
              />
              {g.name}
            </button>
          ))}
        </div>
      )}
      <JustifiedGrid
        photos={visible}
        hrefPrefix={photoPrefix(locale)}
        onOpen={setOpen}
        eager={eager}
      />
      {open !== null && visible[open] && (
        <PhotoViewer photos={visible} index={open} onIndexChange={setOpen} onClose={() => setOpen(null)} />
      )}
    </>
  );
}
