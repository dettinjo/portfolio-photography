import { notFound } from "next/navigation";
import { getTranslations, setRequestLocale } from "next-intl/server";
import type { Metadata } from "next";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { Link } from "@/i18n/navigation";
import { PhotoPageImage } from "@/components/site/PhotoPageImage";
import { getPhotoPage, toLocale, toView } from "@/lib/portfolio";
import { exposureLine } from "@/lib/photo-view";

export const dynamic = "force-dynamic";

type Props = { params: Promise<{ locale: string; id: string }> };

const domain = () => `https://${process.env.NEXT_PUBLIC_PHOTOGRAPHY_DOMAIN}`;

async function load(id: string, locale: string) {
  return /^\d{1,9}$/.test(id) ? getPhotoPage(Number(id), toLocale(locale)) : null;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale, id } = await params;
  const page = await load(id, locale);
  if (!page) return {};
  const { photo, series } = page;
  const title = photo.title ?? `${series.title} · ${page.index + 1}`;
  const path = `/p/${id}`;
  return {
    title,
    description: photo.caption ?? photo.alt,
    alternates: {
      canonical: `${domain()}${locale === "de" ? "/de" : ""}${path}`,
      languages: { en: `${domain()}${path}`, de: `${domain()}/de${path}`, "x-default": `${domain()}${path}` },
    },
    openGraph: {
      title,
      description: photo.caption ?? photo.alt,
      type: "article",
      images: [{ url: `${domain()}${photo.url(1600)}`, width: Math.min(1600, photo.width), alt: photo.alt }],
    },
    twitter: { card: "summary_large_image" },
  };
}

export default async function PhotoPage({ params }: Props) {
  const { locale, id } = await params;
  setRequestLocale(locale);
  const page = await load(id, locale);
  if (!page) notFound();
  const t = await getTranslations("Site.photo");
  const v = await getTranslations("Site.viewer");
  const { photo, series, index, previous, next } = page;
  const views = series.photos.map((p) => toView(p, series));
  const exposure = exposureLine(photo);
  const date = photo.takenAt
    ? new Intl.DateTimeFormat(locale, { year: "numeric", month: "long", day: "numeric" }).format(new Date(photo.takenAt))
    : null;

  return (
    <div className="-mt-14 bg-neutral-950 pt-14 text-white">
      <div className="px-2 pt-4 sm:px-6 sm:pt-6">
        <PhotoPageImage photos={views} index={index} />
      </div>

      <div className="mx-auto grid max-w-[1400px] gap-8 px-4 pb-16 pt-8 sm:px-6 md:grid-cols-[1fr_auto]">
        <div>
          <p className="readout flex items-center gap-2 text-white/50">
            <span className="rec-dot" aria-hidden />
            {String(index + 1).padStart(3, "0")} / {String(series.photos.length).padStart(3, "0")} · {t("inSeries")}{" "}
            <Link href={`/work/${series.slug}`} className="text-white/85 hover:text-rec">
              {series.title}
            </Link>
          </p>
          {photo.title && <h1 className="display mt-3 text-5xl sm:text-6xl">{photo.title}</h1>}
          {!photo.title && <h1 className="sr-only">{photo.alt}</h1>}
          {photo.caption && <p className="mt-3 max-w-2xl leading-relaxed text-white/75">{photo.caption}</p>}
          <dl className="mt-6 flex flex-wrap gap-x-10 gap-y-4 text-sm">
            {date && <Meta label={v("date")}>{date}</Meta>}
            {photo.camera && <Meta label={v("camera")}>{photo.camera}</Meta>}
            {photo.lens && <Meta label={v("lens")}>{photo.lens}</Meta>}
            {exposure && <Meta label={v("settings")}>{exposure}</Meta>}
          </dl>
        </div>
        <div className="flex flex-col items-start gap-4 md:items-end">
          <div className="flex gap-2">
            {previous ? (
              <Link href={`/p/${previous.id}`} className="readout flex items-center gap-1 border border-white/25 px-3 py-2.5 hover:border-white">
                <ChevronLeft className="h-4 w-4" /> {t("previous")}
              </Link>
            ) : null}
            {next ? (
              <Link href={`/p/${next.id}`} className="readout flex items-center gap-1 border border-white/25 px-3 py-2.5 hover:border-white">
                {t("next")} <ChevronRight className="h-4 w-4" />
              </Link>
            ) : null}
          </div>
          <Link href={`/work/${series.slug}`} className="link-slide pb-0.5 text-sm text-white/80 hover:text-white">
            {t("viewSeries")}
          </Link>
          <Link
            href={`/contact?photo=${photo.id}`}
            className="bg-white px-5 py-2.5 text-sm text-black transition hover:bg-rec hover:text-white"
          >
            {t("bookSimilar")}
          </Link>
        </div>
      </div>
    </div>
  );
}

function Meta({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <dt className="readout text-white/45">{label}</dt>
      <dd className="mt-1 text-white/85">{children}</dd>
    </div>
  );
}
