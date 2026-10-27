import { getTranslations, setRequestLocale } from "next-intl/server";
import type { Metadata } from "next";
import type { Review, WithContext, CollectionPage } from "schema-dts";
import { Link } from "@/i18n/navigation";
import { SectionLabel } from "@/components/site/SectionLabel";
import { TestimonialsSection } from "@/components/sections/TestimonialsSection";
import { fetchApprovedReviews } from "@/lib/payload";

export const dynamic = "force-dynamic";

type Props = { params: Promise<{ locale: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "Site.kindWords" });
  return { title: t("metaTitle"), description: t("intro") };
}

export default async function KindWordsPage({ params }: Props) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations("Site.kindWords");
  const reviews = await fetchApprovedReviews();
  const testimonials = reviews.map((r) => ({
    name: r.name,
    quote: r.quote,
    role: r.role ?? "",
    avatar: r.avatarUrl,
    ratings: {
      communication: r.communication,
      creativity: r.creativity,
      professionalism: r.professionalism,
      value: r.value,
    },
  }));

  const jsonLd: WithContext<CollectionPage> = {
    "@context": "https://schema.org",
    "@type": "CollectionPage",
    name: t("title"),
    review: testimonials.map((r) => {
      const values = Object.values(r.ratings);
      return {
        "@type": "Review",
        author: { "@type": "Person", name: r.name },
        reviewRating: {
          "@type": "Rating",
          ratingValue: (values.reduce((a, b) => a + b, 0) / values.length).toFixed(1),
          bestRating: "5",
        },
        reviewBody: r.quote,
      } as Review;
    }),
  };

  return (
    <div className="mx-auto max-w-5xl px-4 py-12 sm:px-6 sm:py-20">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
      <SectionLabel n={1} aside={String(testimonials.length).padStart(3, "0")}>{t("label")}</SectionLabel>
      <h1 className="display display-xl mt-6 text-7xl lowercase sm:text-9xl">{t("title")}</h1>
      <p className="mt-4 text-muted-foreground">{t("intro")}</p>
      <div className="mt-10">
        <TestimonialsSection testimonials={testimonials} />
      </div>
      <Link href="/leave-a-review" className="link-slide mt-12 inline-block pb-0.5">
        {t("leave")}
      </Link>
    </div>
  );
}
