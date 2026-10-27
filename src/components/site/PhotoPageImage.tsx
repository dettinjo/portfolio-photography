"use client";

// The main image of a photo page: ←/→ go to the neighbours, click opens the
// fullscreen viewer within the series.
import { useEffect, useState } from "react";
import { useRouter } from "@/i18n/navigation";
import type { PhotoView } from "@/lib/photo-view";
import { placeholderStyle } from "@/lib/photo-view";
import { PhotoViewer } from "./PhotoViewer";

export function PhotoPageImage({ photos, index }: { photos: PhotoView[]; index: number }) {
  const router = useRouter();
  const [open, setOpen] = useState<number | null>(null);
  const photo = photos[index];

  useEffect(() => {
    if (open !== null) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.target instanceof HTMLElement && /input|textarea/i.test(event.target.tagName)) return;
      if (event.key === "ArrowRight" && photos[index + 1]) router.push(`/p/${photos[index + 1].id}`);
      if (event.key === "ArrowLeft" && photos[index - 1]) router.push(`/p/${photos[index - 1].id}`);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [index, photos, router, open]);

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(index)}
        className="mx-auto block cursor-zoom-in"
        style={{ aspectRatio: `${photo.width} / ${photo.height}`, maxWidth: "100%", maxHeight: "calc(100svh - 9rem)" }}
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={photo.large}
          srcSet={`${photo.srcSet}, ${photo.large} 2400w`}
          sizes="100vw"
          alt={photo.alt}
          fetchPriority="high"
          className="h-full w-full object-contain"
          style={placeholderStyle(photo)}
        />
      </button>
      {open !== null && (
        <PhotoViewer
          photos={photos}
          index={open}
          onIndexChange={setOpen}
          onClose={() => {
            const shown = photos[open];
            setOpen(null);
            if (shown.id !== photo.id) router.replace(`/p/${shown.id}`);
          }}
        />
      )}
    </>
  );
}
