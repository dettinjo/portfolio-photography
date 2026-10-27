import { getTranslations, setRequestLocale } from "next-intl/server";
import type { Metadata } from "next";
import { Link } from "@/i18n/navigation";
import { PhotoStream } from "@/components/site/PhotoStream";
import { SeriesCard } from "@/components/site/SeriesCard";
import { SectionLabel } from "@/components/site/SectionLabel";
import { AccentWord } from "@/components/site/AccentWord";
import { genresOf, getPublishedSeries, toLocale, toView } from "@/lib/portfolio";
import { exposureLine, placeholderStyle } from "@/lib/photo-view";

// Series and photos come from the database (filled by the Nextcloud sync).
export const dynamic = "force-dynamic";

type Props = { params: Promise<{ locale: string }> };

const fullName = () => process.env.NEXT_PUBLIC_FULL_NAME || "Photographer";

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "Site.home" });
  const seo = await getTranslations({ locale, namespace: "photography.PhotographyPageSEO" });
  return {
    title: { absolute: t("metaTitle", { name: fullName().split(" ")[0] }) },
    description: seo("description"),
  };
}

export default async function HomePage({ params }: Props) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations("Site.home");
  const series = await getPublishedSeries(toLocale(locale));

  const photos = series.flatMap((s) => s.photos.map((p) => toView(p, s)));
  // Landscape hero for wide screens, a portrait one for phones (5-star first)
  const all = series.flatMap((s) => s.photos);
  const best = (list: typeof all) => list.find((p) => (p.rating ?? 0) >= 5) ?? list[0] ?? null;
  const hero = best(all.filter((p) => p.width >= p.height)) ?? series[0]?.cover ?? null;
  const heroPortrait = best(all.filter((p) => p.height > p.width)) ?? hero;
  const firstName = fullName().split(" ")[0];

  return (
    <>
      {/* The opening image, framed like a camera viewfinder */}
      <section className="relative -mt-14 h-[100svh] min-h-[520px] overflow-hidden bg-neutral-900 text-white">
        {hero && heroPortrait && (
          <picture>
            <source
              media="(orientation: portrait)"
              srcSet={`${heroPortrait.url(960)} 960w, ${heroPortrait.url(1600)} 1600w`}
              sizes="100vw"
            />
            <img
              src={hero.url(1600)}
              srcSet={`${hero.url(960)} 960w, ${hero.url(1600)} 1600w, ${hero.url(2400)} 2400w`}
              sizes="100vw"
              alt={hero.alt}
              fetchPriority="high"
              className="absolute inset-0 h-full w-full object-cover"
              style={placeholderStyle(hero)}
            />
          </picture>
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/5 to-black/30" />
        <div aria-hidden className="viewfinder absolute inset-x-3 bottom-3 top-16 text-white/80 [--vf-size:28px] sm:inset-x-6 sm:bottom-6 sm:[--vf-size:40px]" />
        <div aria-hidden className="viewfinder absolute left-1/2 top-1/2 h-12 w-12 -translate-x-1/2 -translate-y-1/2 text-white/50 [--vf-line:1px] [--vf-size:10px]" />

        <div className="readout absolute right-6 top-20 flex items-center gap-2 sm:right-10 sm:top-24">
          <span className="rec-dot" aria-hidden /> {t("rec")}
        </div>

        <div className="absolute inset-x-0 bottom-0 mx-auto max-w-[1800px] px-6 pb-10 sm:px-12 sm:pb-14">
          <p className="readout text-white/75">{t("kicker")} — {fullName()}</p>
          <h1 className="display display-xl mt-3 max-w-[14ch] text-[15vw] sm:text-[9vw] lg:text-[7.5vw]">
            {t("headlineA")} <span className="accent-serif">{t("headlineAccent")}</span> {t("headlineB")}
          </h1>
          {hero && exposureLine(hero) && (
            <p className="readout mt-5 text-white/70">{exposureLine(hero)}</p>
          )}
        </div>
      </section>

      <section id="work" className="mx-auto max-w-[1800px] scroll-mt-14 px-1 pt-12 sm:px-6 sm:pt-20">
        <div className="px-3 pb-6 sm:px-0">
          <SectionLabel n={1} aside={t("frames", { count: photos.length })}>
            {t("streamLabel")}
          </SectionLabel>
        </div>
        <h2 className="sr-only">{t("streamTitle")}</h2>
        <PhotoStream
          photos={photos}
          genres={genresOf(series).map(({ slug, name }) => ({ slug, name }))}
          eager={4}
        />
      </section>

      {series.length > 0 && (
        <section className="mx-auto max-w-[1800px] px-4 pt-24 sm:px-6 sm:pt-32">
          <SectionLabel n={2}>{t("seriesLabel")}</SectionLabel>
          <h2 className="display display-xl mt-6 text-7xl lowercase sm:text-8xl">{t("seriesTitle")}</h2>
          <div className="mt-12 grid gap-x-10 gap-y-14 sm:grid-cols-2 lg:grid-cols-3">
            {series.map((s, i) => (
              <SeriesCard key={s.id} series={s} index={i} />
            ))}
          </div>
        </section>
      )}

      <section className="mx-auto max-w-[1800px] px-4 pb-10 pt-24 sm:px-6 sm:pt-32">
        <SectionLabel n={3}>{t("aboutLabel")}</SectionLabel>
        <div className="mt-8 grid gap-10 md:grid-cols-[3fr_2fr] md:items-end">
          <p className="display display-xl text-5xl sm:text-6xl lg:text-7xl">
            <AccentWord text={t("aboutLine", { name: firstName })} word={firstName} className="text-rec" />
          </p>
          <div className="md:justify-self-end">
            <p className="display text-3xl">{t("ctaTitle")}</p>
            <p className="mt-2 max-w-sm text-muted-foreground">{t("ctaText")}</p>
            <div className="mt-6 flex flex-wrap items-center gap-5">
              <Link href="/contact" className="bg-foreground px-6 py-3 text-background transition hover:bg-rec hover:text-white">
                {t("ctaButton")} →
              </Link>
              <Link href="/about" className="link-slide pb-0.5">{t("aboutLink")}</Link>
            </div>
          </div>
        </div>
      </section>
    </>
  );
}
