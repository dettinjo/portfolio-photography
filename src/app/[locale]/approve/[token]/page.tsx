// src/app/[locale]/photography/approve/[token]/page.tsx
import { notFound } from "next/navigation";
import { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { ApprovalInterface } from "@/components/sections/ApprovalInterface";
import type { Album } from "@/lib/strapi";

const STRAPI_URL =
  process.env.NEXT_PUBLIC_STRAPI_API_URL || "http://localhost:1337";

export const dynamic = "force-dynamic";

async function getAlbumByToken(token: string): Promise<Album | null> {
  const url = `${STRAPI_URL}/api/albums/approve/${token}`;
  try {
    const response = await fetch(url, { cache: "no-store" });
    if (!response.ok) {
      return null;
    }
    const data = await response.json();
    return (data.data as Album) || null;
  } catch (error) {
    console.error("Failed to fetch album by token:", error);
    return null;
  }
}

// --- THIS IS THE DEFINITIVE FIX (PART 1) ---
// Define the correct Props type for the page, where params is a Promise.
type Props = {
  params: Promise<{ token: string; locale: string }>;
};

// Update generateMetadata to await the params
export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { token } = await params; // Await the promise here
  const t = await getTranslations("photography.ApprovalPageSEO");
  const album = await getAlbumByToken(token);
  const title = album
    ? t("title", { albumTitle: album.title })
    : t("titleNotFound");

  return {
    title,
    robots: {
      index: false,
      follow: false,
    },
  };
}

// Update the main Page Component to use the correct Props type and await params
export default async function AlbumApprovalPage({ params }: Props) {
  const { token } = await params; // Await the promise here
  const album = await getAlbumByToken(token);

  if (!album) {
    notFound();
  }

  return <ApprovalInterface album={album} token={token} />;
}
