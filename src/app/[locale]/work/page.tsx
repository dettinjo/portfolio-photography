import { getTranslations, setRequestLocale } from "next-intl/server";
import type { Metadata } from "next";
import { SeriesCard } from "@/components/site/SeriesCard";
import { SectionLabel } from "@/components/site/SectionLabel";
import { getPublishedSeries, toLocale } from "@/lib/portfolio";

export const dynamic = "force-dynamic";

type Props = { params: Promise<{ locale: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "Site.work" });
  return { title: t("metaTitle"), description: t("intro") };
}

export default async function WorkPage({ params }: Props) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations("Site.work");
  const series = await getPublishedSeries(toLocale(locale));

  return (
    <div className="mx-auto max-w-[1800px] px-4 py-12 sm:px-6 sm:py-20">
      <SectionLabel n={1} aside={String(series.length).padStart(3, "0")}>{t("label")}</SectionLabel>
      <h1 className="display display-xl text-[19vw] lowercase sm:text-[12vw] lg:text-[9vw] mt-6">{t("title")}</h1>
      <p className="mt-4 max-w-xl text-muted-foreground">{t("intro")}</p>
      {series.length ? (
        <div className="mt-14 grid gap-x-10 gap-y-14 sm:grid-cols-2 lg:grid-cols-3">
          {series.map((s, i) => (
            <SeriesCard key={s.id} series={s} index={i} />
          ))}
        </div>
      ) : (
        <p className="mt-12 text-muted-foreground">{t("empty")}</p>
      )}
    </div>
  );
}
