import { notFound } from "next/navigation";
import { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { ApprovalInterface } from "@/components/sections/ApprovalInterface";
import { fetchAlbumByToken } from "@/lib/payload";
import { fetchAlbums } from "@/lib/nextcloud";

export const dynamic = "force-dynamic";

type Props = {
  params: Promise<{ token: string; locale: string }>;
};

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { token } = await params;
  const t = await getTranslations("photography.ApprovalPageSEO");
  const album = await fetchAlbumByToken(token);
  return {
    title: album ? t("title", { albumTitle: album.title }) : t("titleNotFound"),
    robots: { index: false, follow: false },
  };
}

export default async function AlbumApprovalPage({ params }: Props) {
  const { token } = await params;
  const album = await fetchAlbumByToken(token);

  if (!album) notFound();

  // Pull images for this album from Nextcloud
  const allAlbums = await fetchAlbums();
  const ncAlbum = allAlbums.find((a) => a.slug === album.slug);
  const images = (ncAlbum?.images ?? []).map((img, idx) => ({
    id: img.id ?? idx + 1,
    url: img.url,
    // Extract the filename from the proxy URL's path param
    filename: (() => {
      try {
        const raw = new URL(img.url, "http://x").searchParams.get("path") ?? img.url;
        return decodeURIComponent(raw).split("/").pop() ?? img.url;
      } catch {
        return img.url;
      }
    })(),
    alternativeText: img.alternativeText,
    width: img.width,
    height: img.height,
  }));

  return (
    <ApprovalInterface
      album={{
        slug: album.slug,
        title: album.title,
        clientName: album.clientName,
        approvalStatus: album.approvalStatus,
        existingSelections: album.selections ?? [],
        selectionMin: album.selectionMin ?? 0,
        selectionMax: album.selectionMax ?? 0,
        allowDownloads: album.allowDownloads ?? false,
        approvalTerms: album.approvalTerms,
      }}
      images={images}
      token={token}
    />
  );
}
