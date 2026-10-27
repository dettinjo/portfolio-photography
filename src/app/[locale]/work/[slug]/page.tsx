import { notFound } from "next/navigation";
import { getTranslations, setRequestLocale } from "next-intl/server";
import type { Metadata } from "next";
import type { ImageGallery, WithContext } from "schema-dts";
import { Link } from "@/i18n/navigation";
import { PhotoStream } from "@/components/site/PhotoStream";
import { getPublishedSeries, getSeriesBySlug, toLocale, toView } from "@/lib/portfolio";
import { fetchApprovedReviews } from "@/lib/payload";

export const dynamic = "force-dynamic";

type Props = { params: Promise<{ locale: string; slug: string }> };

const domain = () => `https://${process.env.NEXT_PUBLIC_PHOTOGRAPHY_DOMAIN}`;

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale, slug } = await params;
  const series = await getSeriesBySlug(slug, toLocale(locale));
  if (!series?.photos.length) return {};
  const t = await getTranslations({ locale, namespace: "photography.AlbumPageSEO" });
  const name = (process.env.NEXT_PUBLIC_FULL_NAME || "Photographer").split(" ")[0];
  const description = series.story ?? t("description", { title: series.title, name });
  const path = `/work/${slug}`;
  return {
    title: series.title,
    description,
    alternates: {
      canonical: `${domain()}${locale === "de" ? "/de" : ""}${path}`,
      languages: { en: `${domain()}${path}`, de: `${domain()}/de${path}`, "x-default": `${domain()}${path}` },
    },
    openGraph: {
      title: series.title,
      description,
      images: series.cover ? [{ url: `${domain()}${series.cover.url(1600)}`, alt: series.cover.alt }] : [],
    },
  };
}

export default async function SeriesPage({ params }: Props) {
  const { locale, slug } = await params;
  setRequestLocale(locale);
  const loc = toLocale(locale);
  const series = await getSeriesBySlug(slug, loc);
  if (!series?.photos.length) notFound();

  const t = await getTranslations("Site.work");
  const [all, reviews] = await Promise.all([getPublishedSeries(loc), fetchApprovedReviews(series.id)]);
  const others = all.filter((s) => s.id !== series.id).slice(0, 3);

  const jsonLd: WithContext<ImageGallery> = {
    "@context": "https://schema.org",
    "@type": "ImageGallery",
    name: series.title,
    image: series.photos.map((p) => ({
      "@type": "ImageObject",
      contentUrl: `${domain()}${p.url(1600)}`,
      width: `${p.width}`,
      height: `${p.height}`,
      name: p.title ?? p.alt,
    })),
  };

  return (
    <article className="pb-16">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
      <header className="mx-auto max-w-[1800px] px-4 pb-10 pt-12 sm:px-6 sm:pt-20">
        <div className="readout flex items-center gap-3 text-muted-foreground">
          <Link href="/work" className="text-foreground hover:text-rec">← {t("back")}</Link>
          <span className="h-px flex-1 bg-border" aria-hidden />
          <span>{String(series.photos.length).padStart(3, "0")} frames</span>
        </div>
        <h1 className="display display-xl text-[19vw] lowercase sm:text-[12vw] lg:text-[9vw] mt-6">{series.title}</h1>
        {series.genre && (
          <p className="readout mt-4 text-muted-foreground">
            <span className="text-rec">●</span> {series.genre.name}
          </p>
        )}
        {series.story && (
          <p className="mt-6 max-w-2xl whitespace-pre-line text-lg leading-relaxed text-muted-foreground">
            {series.story}
          </p>
        )}
      </header>
      <div className="mx-auto max-w-[1800px] px-1 sm:px-6">
        <PhotoStream photos={series.photos.map((p) => toView(p, series))} eager={6} />
      </div>
      {reviews.length > 0 && (
        <section className="mx-auto mt-20 max-w-[1800px] px-4 sm:px-6">
          <h2 className="readout text-muted-foreground">
            {t("kindWords")} · {String(reviews.length).padStart(2, "0")}
          </h2>
          <ul className="mt-6 grid gap-10 md:grid-cols-2">
            {reviews.slice(0, 4).map((r) => (
              <li key={r.id}>
                <blockquote className="accent-serif text-3xl leading-snug sm:text-4xl">“{r.quote}”</blockquote>
                <p className="readout mt-4 text-muted-foreground">
                  <span className="text-rec">★ {((r.communication + r.creativity + r.professionalism + r.value) / 4).toFixed(1)}</span> · {r.name}
                  {r.role && ` · ${r.role}`}
                </p>
              </li>
            ))}
          </ul>
          <Link href="/kind-words" className="link-slide mt-8 inline-block pb-0.5">
            {t("kindWords")} →
          </Link>
        </section>
      )}
      {others.length > 0 && (
        <nav className="mx-auto mt-20 max-w-[1800px] border-t border-border/60 px-4 pt-10 sm:px-6">
          <h2 className="readout text-muted-foreground">{t("more")}</h2>
          <ul className="mt-4 flex flex-wrap gap-x-10 gap-y-2">
            {others.map((s) => (
              <li key={s.id}>
                <Link href={`/work/${s.slug}`} className="accent-serif text-4xl transition-colors hover:text-rec">
                  {s.title}
                </Link>
              </li>
            ))}
          </ul>
        </nav>
      )}
    </article>
  );
}
