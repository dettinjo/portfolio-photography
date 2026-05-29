// src/app/[locale]/[slug]/page.tsx
import { notFound } from "next/navigation";
import Image from "next/image";
import { Metadata } from "next";
import {
  fetchAlbumBySlug,
  fetchAllAlbumSlugs,
} from "@/lib/immich";
import { getTranslations } from "next-intl/server";
import { WithContext, ImageGallery, BreadcrumbList } from "schema-dts";
import { routing } from "@/i18n/routing"; // <-- IMPORT ROUTING CONFIG

type Props = {
  params: Promise<{ slug: string; locale: string }>;
};

// Generate static pages at build time
export async function generateStaticParams() {
  const albums = await fetchAllAlbumSlugs();
  return albums.map((album) => ({
    slug: album.slug,
  }));
}

// Generate dynamic metadata for SEO
export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug, locale } = await params;
  const album = await fetchAlbumBySlug(slug);
  if (!album) {
    return { title: "Album Not Found" };
  }

  const t = await getTranslations({
    locale: locale,
    namespace: "photography.AlbumPageSEO",
  });

  const fullName = process.env.NEXT_PUBLIC_FULL_NAME || "Photographer";
  const firstName = fullName.split(" ")[0];
  const photographyDomain = process.env.NEXT_PUBLIC_PHOTOGRAPHY_DOMAIN;

  const { title, coverImage, localizations } = album;
  // coverImage.url is a proxy path (/api/immich/…) — make it absolute for OG tags
  const coverImageUrl = coverImage?.url
    ? `https://${photographyDomain}${coverImage.url}`
    : null;
  const description = t("description", { title: title, name: firstName });

  // --- THIS IS THE FIX (PART 4) ---
  // Build URLs using paths instead of subdomains
  const baseUrl = `https://${photographyDomain}`;
  const languages: Record<string, string> = {};

  // Set current locale's URL
  languages[locale] =
    locale === routing.defaultLocale
      ? `${baseUrl}/${slug}`
      : `${baseUrl}/${locale}/${slug}`;

  // Set alternate locale URLs
  localizations?.forEach((loc) => {
    languages[loc.locale] =
      loc.locale === routing.defaultLocale
        ? `${baseUrl}/${loc.slug}`
        : `${baseUrl}/${loc.locale}/${loc.slug}`;
  });

  return {
    title: title,
    description: description,
    openGraph: {
      title: title,
      description: description,
      images: coverImageUrl
        ? [{ url: coverImageUrl, alt: `Cover image for the album ${title}` }]
        : [],
    },
    alternates: {
      canonical: languages[locale], // The canonical URL is this page's URL
      languages: languages, // The path-based languages object
    },
  };
}

// The main page component
export default async function AlbumDetailPage({ params }: Props) {
  const { slug, locale } = await params;
  const album = await fetchAlbumBySlug(slug);

  if (!album) {
    notFound();
  }

  const { title, images } = album;

  // FIX: Define photographyDomain within the component scope
  const photographyDomain = process.env.NEXT_PUBLIC_PHOTOGRAPHY_DOMAIN;

  const imageGalleryJsonLd: WithContext<ImageGallery> = {
    "@context": "https://schema.org",
    "@type": "ImageGallery",
    name: title,
    image: images?.map((image) => ({
      "@type": "ImageObject",
      // image.url is a proxy path — make it absolute for structured data
      contentUrl: `https://${photographyDomain}${image.url}`,
      name: image.alternativeText || `Photograph from the album ${title}`,
    })),
  };

  // --- THIS IS THE FIX (PART 5) ---
  // Make Breadcrumb home URL locale-aware
  const homeUrl = `https://${photographyDomain}${
    locale === routing.defaultLocale ? "" : `/${locale}`
  }`;

  const breadcrumbJsonLd: WithContext<BreadcrumbList> = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: [
      {
        "@type": "ListItem",
        position: 1,
        name: "Home", // NOTE: This name should also be translated
        item: homeUrl, // Use the new dynamic homeUrl
      },
      {
        "@type": "ListItem",
        position: 2,
        name: title,
      },
    ],
  };

  return (
    <article className="container mx-auto py-16 px-4 md:py-24">
      {/* ADDED: Script tags for JSON-LD structured data */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(imageGalleryJsonLd) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbJsonLd) }}
      />
      <h1 className="text-4xl font-bold mb-12 text-center">{title}</h1>

      <div className="columns-2 md:columns-3 lg:columns-4 gap-4 space-y-4">
        {images?.map((image) => (
          <div key={image.id} className="break-inside-avoid">
            <Image
              src={image.url}
              alt={
                image.alternativeText || `Photograph from the album ${title}`
              }
              width={image.width}
              height={image.height}
              className="rounded-xl w-full h-auto block border-2 border-foreground"
              sizes="(max-width: 768px) 50vw, (max-width: 1200px) 33vw, 25vw"
            />
          </div>
        ))}
      </div>
    </article>
  );
}
