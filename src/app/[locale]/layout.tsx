// src/app/[locale]/layout.tsx
import React from "react";
import { notFound } from "next/navigation";
import { Metadata } from "next";
import { Inter } from "next/font/google";
import { NextIntlClientProvider } from "next-intl";
import {
  getMessages,
  getTranslations,
  setRequestLocale,
} from "next-intl/server";
import { Analytics } from "@vercel/analytics/react";
import { SpeedInsights } from "@vercel/speed-insights/next";

// Import global styles here since we are deleting the old root layout
import "../globals.css";

import { routing, isValidLocale } from "@/i18n/routing";
import { cn } from "@/lib/utils";
import { ThemeProvider } from "@/components/Theme-Provider";
import { PhotographyHeader } from "@/components/layout/PhotographyHeader";
import { Footer } from "@/components/layout/Footer";

const inter = Inter({ subsets: ["latin"] });

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
  // Add x-default for SEO best practices
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
        url: "/favicon-light.svg",
        href: "/favicon-light.svg",
      },
      {
        media: "(prefers-color-scheme: dark)",
        url: "/favicon-dark.svg",
        href: "/favicon-dark.svg",
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

  // Validate the locale
  if (!isValidLocale(locale)) {
    notFound();
  }

  // Enable static rendering for this locale
  setRequestLocale(locale);

  const messages = await getMessages();

  return (
    <html lang={locale} suppressHydrationWarning>
      <body
        className={cn(
          "min-h-screen bg-background font-sans antialiased",
          inter.className
        )}
      >
        <NextIntlClientProvider locale={locale} messages={messages}>
          <ThemeProvider attribute="class" defaultTheme="system" enableSystem>
            <div className="relative flex min-h-dvh flex-col bg-background">
              {/* The Single Header for the entire app */}
              <PhotographyHeader />

              <main className="flex-1">{children}</main>

              <Footer />
            </div>
            <Analytics />
            <SpeedInsights />
          </ThemeProvider>
        </NextIntlClientProvider>
      </body>
    </html>
  );
}
