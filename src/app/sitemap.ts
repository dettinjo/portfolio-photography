// src/app/sitemap.ts
import { MetadataRoute } from "next";
import { fetchAlbums } from "@/lib/nextcloud";
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
  const albums = await fetchAlbums();

  albums.forEach((album) => {
    const alternates: Record<string, string> = {};
    locales.forEach((locale) => {
      alternates[locale] = getUrl(album.slug, locale);
    });

    locales.forEach((locale) => {
      sitemapEntries.push({
        url: alternates[locale],
        lastModified: new Date(),
        alternates: { languages: alternates },
      });
    });
  });

  return sitemapEntries;
}
