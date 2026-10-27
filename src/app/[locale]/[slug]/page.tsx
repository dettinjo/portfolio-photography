import { permanentRedirect } from "next/navigation";

// Album pages moved to /work/<slug>; keep old links and search results working.
export default async function LegacyAlbumPage({
  params,
}: {
  params: Promise<{ locale: string; slug: string }>;
}) {
  const { locale, slug } = await params;
  permanentRedirect(`${locale === "de" ? "/de" : ""}/work/${encodeURIComponent(slug)}`);
}
