import { getTranslations, setRequestLocale } from "next-intl/server";
import type { Metadata } from "next";
import Image from "next/image";
import { Instagram } from "lucide-react";
import { Link } from "@/i18n/navigation";
import { SectionLabel } from "@/components/site/SectionLabel";

type Props = { params: Promise<{ locale: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "Site.about" });
  const bio = await getTranslations({ locale, namespace: "photography.PhotographyPage" });
  return { title: t("metaTitle"), description: bio("profileBio").slice(0, 160) };
}

export default async function AboutPage({ params }: Props) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations("Site.about");
  const bio = await getTranslations("photography.PhotographyPage");
  const name = process.env.NEXT_PUBLIC_FULL_NAME || "Photographer";
  const instagram = process.env.NEXT_PUBLIC_INSTAGRAM_USERNAME;

  return (
    <div className="mx-auto max-w-6xl px-4 py-12 sm:px-6 sm:py-20">
      <SectionLabel n={1}>{t("label")}</SectionLabel>
      <div className="mt-10 grid gap-12 md:grid-cols-[2fr_3fr] md:gap-16">
        {/* The photographer, as a print on the table */}
        <figure className="-rotate-2 self-start bg-[#fbfaf7] p-3 pb-4 shadow-[0_12px_30px_-12px_rgba(0,0,0,0.35)] transition duration-500 hover:rotate-0 md:sticky md:top-24">
          <div className="relative aspect-[4/5] overflow-hidden bg-muted">
            <Image
              src="/images/profile.webp"
              alt={name}
              fill
              sizes="(max-width: 768px) 100vw, 40vw"
              className="object-cover"
              priority
            />
          </div>
          <figcaption className="accent-serif mt-3 text-xl text-neutral-900">{name}</figcaption>
        </figure>
        <div>
          <h1 className="display display-xl text-7xl lowercase sm:text-8xl">{t("title")}</h1>
          <p className="mt-8 text-lg leading-relaxed">{bio("profileBio")}</p>
          <h2 className="display mt-14 text-4xl lowercase">{t("approachTitle")}</h2>
          <p className="mt-3 leading-relaxed text-muted-foreground">{t("approach")}</p>
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
    </div>
  );
}
