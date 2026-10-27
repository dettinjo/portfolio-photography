// Justified photo rows in pure CSS: every item grows in proportion to its
// aspect ratio, so each row fills the width at one common height and no photo
// is cropped. The trailing filler keeps the last row from being stretched.
import type { PhotoView } from "@/lib/photo-view";
import { placeholderStyle } from "@/lib/photo-view";
import { cn } from "@/lib/utils";

interface JustifiedGridProps {
  photos: PhotoView[];
  hrefFor: (photo: PhotoView) => string;
  onOpen?: (index: number) => void;
  /** Load the first n images eagerly (above the fold) */
  eager?: number;
  className?: string;
}

export function JustifiedGrid({ photos, hrefFor, onOpen, eager = 0, className }: JustifiedGridProps) {
  return (
    <div
      className={cn(
        "flex flex-wrap gap-1 [--row-h:230px] sm:gap-1.5 sm:[--row-h:240px] lg:[--row-h:300px] 2xl:[--row-h:360px]",
        "after:block after:flex-[999_1_0px] after:content-['']",
        className,
      )}
    >
      {photos.map((photo, index) => {
        const ratio = photo.width / photo.height;
        return (
          <a
            key={photo.id}
            href={hrefFor(photo)}
            onClick={(event) => {
              if (!onOpen || event.metaKey || event.ctrlKey || event.shiftKey || event.button !== 0) return;
              event.preventDefault();
              onOpen(index);
            }}
            className="group relative block overflow-hidden focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-foreground"
            style={{ flexGrow: ratio, flexBasis: `calc(${ratio} * var(--row-h))` }}
          >
            <div style={{ paddingBottom: `${100 / ratio}%`, ...placeholderStyle(photo) }} />
            {/* eslint-disable-next-line @next/next/no-img-element -- sized variants are served by /api/photos */}
            <img
              src={photo.src}
              srcSet={photo.srcSet}
              sizes="(max-width: 640px) 50vw, (max-width: 1024px) 40vw, 30vw"
              alt={photo.alt}
              width={photo.width}
              height={photo.height}
              loading={index < eager ? "eager" : "lazy"}
              decoding="async"
              className="absolute inset-0 h-full w-full object-cover"
            />
            {/* Hover: viewfinder corners and the frame number */}
            <span
              aria-hidden
              className="viewfinder pointer-events-none absolute inset-3 text-white opacity-0 transition-all duration-300 group-hover:inset-2 group-hover:opacity-100 group-focus-visible:opacity-100"
            />
            <span
              aria-hidden
              className="readout pointer-events-none absolute bottom-3 left-3 text-white opacity-0 drop-shadow transition-opacity duration-300 group-hover:opacity-100"
            >
              #{String(index + 1).padStart(2, "0")}
            </span>
          </a>
        );
      })}
    </div>
  );
}
