import type { MetadataRoute } from "next";
import { routing } from "@/i18n/routing";
import { getPublishedSeries } from "@/lib/portfolio";

// Series and photos live in the database, which is not available at build time.
export const dynamic = "force-dynamic";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const baseUrl = `https://${process.env.NEXT_PUBLIC_PHOTOGRAPHY_DOMAIN}`;
  const { locales, defaultLocale } = routing;
  const url = (path: string, locale: string) =>
    `${baseUrl}${locale === defaultLocale ? "" : `/${locale}`}${path}`;

  const entry = (path: string, priority: number): MetadataRoute.Sitemap =>
    locales.map((locale) => ({
      url: url(path, locale),
      lastModified: new Date(),
      priority,
      alternates: { languages: Object.fromEntries(locales.map((l) => [l, url(path, l)])) },
    }));

  const series = await getPublishedSeries("en");
  return [
    ...entry("", 1),
    ...entry("/work", 0.9),
    ...series.flatMap((s) => entry(`/work/${s.slug}`, 0.8)),
    ...series.flatMap((s) => s.photos.flatMap((p) => entry(`/p/${p.id}`, 0.5))),
    ...entry("/about", 0.7),
    ...entry("/contact", 0.7),
    ...entry("/kind-words", 0.5),
    ...entry("/imprint", 0.1),
    ...entry("/privacy_policy", 0.1),
  ];
}
