import { getTranslations } from "next-intl/server";
import { PhotographyTabs } from "@/components/sections/PhotographyTabs";
import { ProfileHeaderSection } from "@/components/sections/ProfileHeaderSection";
import { fetchAlbums } from "@/lib/nextcloud";
import { fetchApprovedReviews } from "@/lib/payload";
import { WithContext, CollectionPage, Review } from "schema-dts";
import { Metadata } from "next";

// UPDATED: 'params' prop is now correctly typed as a Promise.
type Props = {
  params: Promise<{ locale: string }>;
};

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  // UPDATED: Await the promise to get the locale.
  const { locale } = await params;
  const t = await getTranslations({
    locale,
    namespace: "photography.PhotographyPageSEO",
  });
  const fullName = process.env.NEXT_PUBLIC_FULL_NAME || "Photographer";
  const firstName = fullName.split(" ")[0];
  const siteTitle = t("siteName", { name: firstName });
  const photographyDomain = process.env.NEXT_PUBLIC_PHOTOGRAPHY_DOMAIN;

  return {
    title: siteTitle,
    description: t("description"),
    alternates: {
      canonical: `https://${photographyDomain}`,
      languages: {
        en: `https://${photographyDomain}`,
        de: `https://de.${photographyDomain}`,
        "x-default": `https://${photographyDomain}`,
      },
    },
    openGraph: {
      title: siteTitle,
      description: t("description"),
      url: `https://${photographyDomain}`,
      siteName: siteTitle,
      type: "website",
      locale: locale,
    },
  };
}

// UPDATED: The component now takes 'Props' and awaits 'params'.
export default async function PhotographyPage({ params }: Props) {
  // UPDATED: Await the promise to get the locale.
  await params; // locale resolved by next-intl request context

  const t = await getTranslations("photography.PhotographyPage");
  const [rawAlbums, rawReviews] = await Promise.all([
    fetchAlbums(),
    fetchApprovedReviews().catch(() => []),
  ]);
  const profileName = process.env.NEXT_PUBLIC_FULL_NAME || "Photographer";
  const photographyDomain = process.env.NEXT_PUBLIC_PHOTOGRAPHY_DOMAIN;

  const albums = rawAlbums
    .filter((album) => album && album.slug)
    .map((album) => ({
      id: album.id,
      slug: album.slug,
      title: album.title,
      coverImageUrl: album.coverImage?.url ?? "/placeholder.jpg",
      images: (album.images || []).map((img) => img.url),
    }));

  const cmsUrl = process.env.NEXT_PUBLIC_CMS_URL ?? "https://cms.joeldettinger.de";
  const testimonials = rawReviews.map((r) => ({
    name: r.name,
    quote: r.quote,
    role: r.role ?? "",
    avatar: r.avatar?.url ? `${cmsUrl}${r.avatar.url}` : null,
    ratings: {
      communication: r.communication ?? 0,
      creativity: r.creativity ?? 0,
      professionalism: r.professionalism ?? 0,
      value: r.value ?? 0,
    },
  }));

  const jsonLd: WithContext<CollectionPage> = {
    "@context": "https://schema.org",
    "@type": "CollectionPage",
    name: `Photography by ${profileName}`,
    url: `https://${photographyDomain}`,
    review: testimonials.map((testimonial) => {
      const ratingValues = Object.values(testimonial.ratings);
      const averageRating =
        ratingValues.reduce((sum, rating) => sum + rating, 0) /
        ratingValues.length;
      return {
        "@type": "Review",
        author: {
          "@type": "Person",
          name: testimonial.name,
        },
        reviewRating: {
          "@type": "Rating",
          ratingValue: averageRating.toFixed(1),
          bestRating: "5",
        },
        reviewBody: testimonial.quote,
      } as Review;
    }),
  };

  return (
    <div className="container mx-auto max-w-5xl py-12 px-4 md:py-24">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      <ProfileHeaderSection
        name={profileName}
        bio={t("profileBio")}
        avatarSrc={"/images/profile.webp"}
      />

      <PhotographyTabs
        albums={albums}
        testimonials={testimonials}
        translations={{
          feed: t("tabs.feed"),
          services: t("tabs.services"),
          testimonials: t("tabs.testimonials"),
          contact: t("tabs.contact"),
        }}
      />
    </div>
  );
}
