import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";

// The client area is private: never indexed, always rendered per request.
export const dynamic = "force-dynamic";

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "Portal" });
  return { title: t("metaTitle"), robots: { index: false, follow: false } };
}

export default function PortalLayout({ children }: { children: React.ReactNode }) {
  return <div className="mx-auto min-h-[70vh] max-w-6xl px-4 py-12 sm:px-6 sm:py-20">{children}</div>;
}
