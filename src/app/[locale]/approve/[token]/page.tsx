import { notFound } from "next/navigation";
import { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { ApprovalInterface } from "@/components/sections/ApprovalInterface";
import { fetchAlbumByToken } from "@/lib/payload";
import { fetchAlbumBySlug } from "@/lib/nextcloud";

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
  const ncAlbum = await fetchAlbumBySlug(album.slug);
  const images = (ncAlbum?.images ?? []).map((img) => ({
    id: img.id,
    url: img.url,
    thumbnailUrl: img.thumbnailUrl,
    filename: img.filename,
    alternativeText: img.alternativeText,
    width: img.width,
    height: img.height,
  }));

  return (
    <ApprovalInterface
      album={{
        slug: album.slug,
        title: album.title,
        clientName: album.clientName ?? undefined,
        approvalStatus: album.approvalStatus ?? "pending",
        existingSelections: (album.selections ?? []).map((s) => ({
          filename: s.filename,
          comment: s.comment ?? undefined,
        })),
        selectionMin: album.selectionMin ?? 0,
        selectionMax: album.selectionMax ?? 0,
        allowDownloads: album.allowDownloads ?? false,
        approvalTerms: album.approvalTerms ?? undefined,
      }}
      images={images}
      token={token}
    />
  );
}
