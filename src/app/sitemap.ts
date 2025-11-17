// src/app/sitemap.ts
import { MetadataRoute } from "next";
// --- THIS IS THE FIX (PART 6) ---
// We import fetchAlbums to get localization data, not just slugs
import { fetchAlbums } from "@/lib/strapi";
import { routing } from "@/i18n/routing";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const photographyDomain = process.env.NEXT_PUBLIC_PHOTOGRAPHY_DOMAIN;
  const baseUrl = `https://${photographyDomain}`;
  const { locales, defaultLocale } = routing;

  // Helper to create a localized URL
  const getUrl = (slug: string, locale: string) => {
    const path = slug ? `/${slug}` : "";
    if (locale === defaultLocale) {
      return `${baseUrl}${path}`;
    }
    return `${baseUrl}/${locale}${path}`;
  };

  const sitemapEntries: MetadataRoute.Sitemap = [];

  // 1. Static Pages (Home, Imprint, Privacy Policy)
  const staticPages = ["", "imprint", "privacy_policy"];
  staticPages.forEach((slug) => {
    const alternates: Record<string, string> = {};
    locales.forEach((locale) => {
      alternates[locale] = getUrl(slug, locale);
    });

    // Add an entry for *each* locale version of the static page
    locales.forEach((locale) => {
      sitemapEntries.push({
        url: getUrl(slug, locale),
        lastModified: new Date(),
        alternates: {
          languages: alternates,
        },
      });
    });
  });

  // 2. Dynamic Album Pages
  // Fetch *all* albums from the default locale, populating localizations
  const defaultLocaleAlbums = await fetchAlbums(defaultLocale);

  defaultLocaleAlbums.forEach((album) => {
    const alternates: Record<string, string> = {};

    // Add default locale
    alternates[defaultLocale] = getUrl(album.slug, defaultLocale);

    // Add other locales
    album.localizations?.forEach((loc) => {
      alternates[loc.locale] = getUrl(loc.slug, loc.locale);
    });

    // Add an entry for *each* locale version of the album
    locales.forEach((locale) => {
      if (alternates[locale]) {
        sitemapEntries.push({
          url: alternates[locale],
          lastModified: new Date(), // Or use album.updatedAt if available
          alternates: {
            languages: alternates,
          },
        });
      }
    });
  });

  return sitemapEntries;
}
