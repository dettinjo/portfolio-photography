import { WifiOff } from "lucide-react";
import { getTranslations, setRequestLocale } from "next-intl/server";

type Props = { params: Promise<{ locale: string }> };

export async function generateMetadata({ params }: Props) {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "Offline" });
  return { title: t("title"), robots: { index: false, follow: false } };
}

// Shown by the service worker when a page is requested without a connection
// and has not been visited before.
export default async function OfflinePage({ params }: Props) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations("Offline");
  return (
    <div className="container mx-auto flex max-w-md flex-col items-center py-24 text-center">
      <WifiOff className="mb-6 h-12 w-12 text-muted-foreground" />
      <h1 className="text-2xl font-bold">{t("title")}</h1>
      <p className="mt-3 text-muted-foreground">{t("message")}</p>
    </div>
  );
}
