import { getTranslations, setRequestLocale } from "next-intl/server";
import type { Metadata } from "next";
import { ContactSection } from "@/components/sections/ContactSection";
import { SectionLabel } from "@/components/site/SectionLabel";

type Props = {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{ photo?: string }>;
};

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "Site.contact" });
  return { title: t("metaTitle"), description: t("intro") };
}

export default async function ContactPage({ params, searchParams }: Props) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations("Site.contact");
  const { photo } = await searchParams;
  // "Book a shoot like this" links here with the photo id
  const defaultMessage = photo && /^\d{1,9}$/.test(photo) ? t("aboutPhoto", { id: photo }) : "";
  return (
    <div className="mx-auto max-w-6xl px-4 py-12 sm:px-6 sm:py-20">
      <div className="mb-10">
        <SectionLabel n={1}>{t("label")}</SectionLabel>
      </div>
      <ContactSection headingLevel="h1" defaultMessage={defaultMessage} />
    </div>
  );
}
