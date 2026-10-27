import { getTranslations } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import type { PortfolioSeries } from "@/lib/portfolio";
import { placeholderStyle } from "@/lib/photo-view";

// Small prints on a table: a paper border and a slight tilt that straightens
// on hover. The tilt alternates with the card's position.
const TILTS = ["-rotate-[1.6deg]", "rotate-[1.2deg]", "-rotate-[0.6deg]", "rotate-[2deg]"];

export async function SeriesCard({ series, index = 0 }: { series: PortfolioSeries; index?: number }) {
  const t = await getTranslations("Site.home");
  const cover = series.cover;
  return (
    <Link href={`/work/${series.slug}`} className="group block">
      <div
        className={`${TILTS[index % TILTS.length]} bg-[#fbfaf7] p-2.5 pb-12 shadow-[0_1px_2px_rgba(0,0,0,0.08),0_12px_30px_-12px_rgba(0,0,0,0.35)] transition duration-500 ease-out group-hover:-translate-y-1 group-hover:rotate-0 sm:p-3 sm:pb-14 dark:bg-[#e9e6df]`}
      >
        <div className="relative aspect-[4/5] overflow-hidden" style={cover ? placeholderStyle(cover) : undefined}>
          {cover && (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={cover.url(960)}
              srcSet={`${cover.url(480)} 480w, ${cover.url(960)} 960w, ${cover.url(1600)} 1600w`}
              sizes="(max-width: 640px) 90vw, (max-width: 1024px) 45vw, 30vw"
              alt={cover.alt}
              loading="lazy"
              decoding="async"
              className="h-full w-full object-cover"
            />
          )}
        </div>
        <div className="mt-3 flex items-baseline justify-between gap-3 text-neutral-900">
          <h3 className="accent-serif text-2xl leading-none">{series.title}</h3>
          <span className="readout shrink-0 text-neutral-500">{t("frames", { count: series.photos.length })}</span>
        </div>
      </div>
      {series.genre && (
        <p className="readout mt-4 pl-1 text-muted-foreground">
          <span className="text-rec">●</span> {series.genre.name}
        </p>
      )}
    </Link>
  );
}
