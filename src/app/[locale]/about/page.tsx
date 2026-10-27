import { getTranslations, setRequestLocale } from "next-intl/server";
import type { Metadata } from "next";
import Image from "next/image";
import { Instagram } from "lucide-react";
import { Link } from "@/i18n/navigation";
import { Faq } from "@/components/site/Faq";
import { SectionLabel } from "@/components/site/SectionLabel";
import { getAbout } from "@/lib/about";
import { toLocale } from "@/lib/portfolio";

// Texts are edited in the admin panel ("About & FAQ").
export const dynamic = "force-dynamic";

type Props = { params: Promise<{ locale: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "Site.about" });
  const fallback = await getTranslations({ locale, namespace: "photography.PhotographyPage" });
  const about = await getAbout(toLocale(locale));
  const description = (about.bio[0] ?? fallback("profileBio")).slice(0, 160);
  return { title: t("metaTitle"), description };
}

export default async function AboutPage({ params }: Props) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations("Site.about");
  const fallback = await getTranslations("photography.PhotographyPage");
  const about = await getAbout(toLocale(locale));
  const name = process.env.NEXT_PUBLIC_FULL_NAME || "Photographer";
  const instagram = process.env.NEXT_PUBLIC_INSTAGRAM_USERNAME;

  const bio = about.bio.length ? about.bio : [fallback("profileBio")];
  const approach = about.approach.length ? about.approach : [t("approach")];

  const faqJsonLd = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: about.faq.map((f) => ({
      "@type": "Question",
      name: f.question,
      acceptedAnswer: { "@type": "Answer", text: f.answer.join("\n\n") },
    })),
  };

  return (
    <div className="mx-auto max-w-6xl px-4 py-12 sm:px-6 sm:py-20">
      <SectionLabel n={1}>{t("label")}</SectionLabel>
      <div className="mt-10 grid gap-12 md:grid-cols-[2fr_3fr] md:gap-16">
        {/* The photographer, as a print on the table */}
        <figure className="-rotate-2 self-start bg-[#fbfaf7] p-3 pb-4 shadow-[0_12px_30px_-12px_rgba(0,0,0,0.35)] transition duration-500 hover:rotate-0 md:sticky md:top-24">
          <div className="relative aspect-[4/5] overflow-hidden bg-muted">
            <Image
              src={about.portrait?.url ?? "/images/profile.webp"}
              alt={about.portrait?.alt || name}
              fill
              sizes="(max-width: 768px) 100vw, 40vw"
              className="object-cover"
              unoptimized={Boolean(about.portrait)}
              priority
            />
          </div>
          <figcaption className="accent-serif mt-3 text-xl text-neutral-900">{name}</figcaption>
        </figure>
        <div>
          <h1 className="display display-xl text-7xl lowercase sm:text-8xl">{t("title")}</h1>
          <div className="mt-8 space-y-4 text-lg leading-relaxed">
            {bio.map((p) => (
              <p key={p}>{p}</p>
            ))}
          </div>

          {about.facts.length > 0 && (
            <dl className="mt-10 grid grid-cols-2 gap-x-6 gap-y-4 border-t border-border pt-6 sm:grid-cols-3">
              {about.facts.map((f) => (
                <div key={f.label}>
                  <dt className="readout text-muted-foreground">{f.label}</dt>
                  <dd className="mt-1 font-mono text-sm">{f.value}</dd>
                </div>
              ))}
            </dl>
          )}

          <h2 className="display mt-14 text-4xl lowercase">{about.approachTitle ?? t("approachTitle")}</h2>
          <div className="mt-3 space-y-3 leading-relaxed text-muted-foreground">
            {approach.map((p) => (
              <p key={p}>{p}</p>
            ))}
          </div>
          <div className="mt-10 flex flex-wrap items-center gap-5">
            <Link
              href="/contact"
              className="bg-foreground px-6 py-3 text-background transition hover:bg-rec hover:text-white"
            >
              {t("cta")} →
            </Link>
            {instagram && (
              <a
                href={`https://instagram.com/${instagram}`}
                target="_blank"
                rel="noopener noreferrer"
                className="link-slide flex items-center gap-2 pb-0.5"
              >
                <Instagram className="h-4 w-4" /> {t("instagram")}
              </a>
            )}
          </div>
        </div>
      </div>

      {about.faq.length > 0 && (
        <section id="faq" className="mt-28 scroll-mt-20">
          <SectionLabel n={2} aside={String(about.faq.length).padStart(3, "0")}>
            {t("faqLabel")}
          </SectionLabel>
          <div className="mt-6 grid gap-10 lg:grid-cols-[2fr_3fr] lg:gap-16">
            <div>
              <h2 className="display display-xl text-6xl lowercase sm:text-7xl">{t("faqTitle")}</h2>
              <p className="mt-6 text-muted-foreground">
                {t("faqMore")}{" "}
                <Link href="/contact" className="link-slide text-foreground">
                  {t("faqAsk")} →
                </Link>
              </p>
            </div>
            <Faq items={about.faq} />
          </div>
          <script
            type="application/ld+json"
            dangerouslySetInnerHTML={{ __html: JSON.stringify(faqJsonLd).replace(/</g, "\\u003c") }}
          />
        </section>
      )}
    </div>
  );
}
