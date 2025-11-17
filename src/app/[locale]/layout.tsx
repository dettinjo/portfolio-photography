// src/app/[locale]/layout.tsx
import { NextIntlClientProvider } from "next-intl";
import {
  getMessages,
  getTranslations,
  setRequestLocale,
} from "next-intl/server";
import { routing, isValidLocale } from "@/i18n/routing";
import { notFound } from "next/navigation";
import React from "react";
import { Metadata } from "next";

import { PhotographyHeader } from "@/components/layout/PhotographyHeader";
import { Footer } from "@/components/layout/Footer";

export function generateStaticParams() {
  return routing.locales.map((locale) => ({ locale }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({
    locale,
    namespace: "photography.PhotographyPageSEO",
  });

  const fullName = process.env.NEXT_PUBLIC_FULL_NAME || "Photographer";
  const firstName = fullName.split(" ")[0];
  const siteTitle = t("siteName", { name: firstName });
  const photographyDomain = process.env.NEXT_PUBLIC_PHOTOGRAPHY_DOMAIN;

  const baseUrl = `https://${photographyDomain}`;

  const canonicalUrl =
    locale === routing.defaultLocale ? baseUrl : `${baseUrl}/${locale}`;

  const languages: Record<string, string> = {};
  routing.locales.forEach((loc) => {
    languages[loc] =
      loc === routing.defaultLocale ? baseUrl : `${baseUrl}/${loc}`;
  });
  languages["x-default"] = languages[routing.defaultLocale];

  return {
    title: {
      template: `%s | ${siteTitle}`,
      default: siteTitle,
    },
    description: t("description"),
    alternates: {
      canonical: canonicalUrl,
      languages: languages,
    },
    openGraph: {
      title: siteTitle,
      description: t("description"),
      url: canonicalUrl,
      siteName: siteTitle,
      type: "website",
      locale: locale,
    },
    icons: [
      {
        media: "(prefers-color-scheme: light)",
        url: "/favicon-photography-light.svg",
        href: "/favicon-photography-light.svg",
      },
      {
        media: "(prefers-color-scheme: dark)",
        url: "/favicon-photography-dark.svg",
        href: "/favicon-photography-dark.svg",
      },
    ],
  };
}

type Props = {
  children: React.ReactNode;
  params: Promise<{ locale: string }>;
};

export default async function LocaleLayout({ children, params }: Props) {
  const { locale } = await params;

  if (!isValidLocale(locale)) {
    notFound();
  }
  setRequestLocale(locale);

  const messages = await getMessages();

  return (
    <NextIntlClientProvider locale={locale} messages={messages}>
      <div className="relative flex min-h-dvh flex-col bg-background">
        <PhotographyHeader />
        <main className="flex-1">{children}</main>
        <Footer />
      </div>
    </NextIntlClientProvider>
  );
}
