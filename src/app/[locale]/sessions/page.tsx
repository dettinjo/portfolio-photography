import { getTranslations, setRequestLocale } from "next-intl/server";
import type { Metadata } from "next";
import { Link } from "@/i18n/navigation";
import { AccentWord } from "@/components/site/AccentWord";
import { OfferingBlock } from "@/components/site/OfferingBlock";
import { SectionLabel } from "@/components/site/SectionLabel";
import { ShootPlanner } from "@/components/site/ShootPlanner";
import { getSessions } from "@/lib/sessions";
import { toLocale } from "@/lib/portfolio";

// Offerings depend on which genres have published series (database).
export const dynamic = "force-dynamic";

type Props = {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{ offering?: string; genre?: string; photo?: string }>;
};

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "Site.sessions" });
  return { title: t("metaTitle"), description: t("metaDescription") };
}

export default async function SessionsPage({ params, searchParams }: Props) {
  const { locale } = await params;
  setRequestLocale(locale);
  const loc = toLocale(locale);
  const t = await getTranslations("Site.sessions");
  const { offerings, addOns, priceNote } = await getSessions(loc);
  const query = await searchParams;

  // Preselect an offering: ?offering=<slug>, or ?genre=<slug> from "book a shoot like this"
  const initialOffering =
    offerings.find((o) => o.slug === query.offering)?.slug ?? offerings.find((o) => o.genre === query.genre)?.slug;
  const photoId = query.photo && /^\d{1,9}$/.test(query.photo) ? Number(query.photo) : undefined;
  let n = 1;

  return (
    <div className="mx-auto max-w-[1800px] px-4 pb-10 pt-12 sm:px-6 sm:pt-20">
      <SectionLabel n={n++} aside={String(offerings.length).padStart(3, "0")}>
        {t("label")}
      </SectionLabel>
      <h1 className="display display-xl mt-6 max-w-[16ch] text-[16vw] sm:text-[10vw] lg:text-[8vw]">
        <AccentWord text={`${t("headlineA")} ${t("headlineAccent")} ${t("headlineB")}`} word={t("headlineAccent")} className="text-rec" />
      </h1>
      <p className="mt-6 max-w-xl text-lg text-muted-foreground">{t("intro")}</p>

      {offerings.length ? (
        <div className="mt-20 space-y-28">
          {offerings.map((o, i) => (
            <OfferingBlock key={o.id} offering={o} index={i} locale={loc} />
          ))}
        </div>
      ) : (
        <p className="mt-16 text-lg">
          {t("empty")}{" "}
          <Link href="/contact" className="link-slide">
            →
          </Link>
        </p>
      )}

      {addOns.length > 0 && (
        <section className="mt-28">
          <SectionLabel n={n++}>{t("addOnsLabel")}</SectionLabel>
          <h2 className="display display-xl mt-6 text-6xl lowercase sm:text-7xl">{t("addOnsTitle")}</h2>
          <ul className="mt-8 max-w-3xl divide-y divide-border border-y border-border">
            {addOns.map((a) => (
              <li key={a.label} className="flex items-baseline justify-between gap-6 py-4 text-lg">
                <span>{a.label}</span>
                <span className="font-mono text-sm">{a.price}</span>
              </li>
            ))}
          </ul>
          {priceNote && <p className="readout mt-4 text-muted-foreground">{priceNote}</p>}
        </section>
      )}

      <section id="plan" className="mt-28 scroll-mt-20">
        <SectionLabel n={n++}>{t("planner.label")}</SectionLabel>
        <div className="mt-6 grid gap-10 lg:grid-cols-[2fr_3fr] lg:gap-20">
          <h2 className="display display-xl text-7xl lowercase sm:text-8xl">{t("planner.title")}</h2>
          <ShootPlanner
            key={`${initialOffering ?? "none"}-${photoId ?? ""}`}
            offerings={offerings.map(({ id, slug, title }) => ({ id, slug, title }))}
            initialOffering={initialOffering}
            photoId={photoId}
          />
        </div>
      </section>
    </div>
  );
}
