import { getTranslations } from "next-intl/server";
import { Link } from "@/i18n/navigation";

export async function SiteFooter({ name }: { name: string }) {
  const t = await getTranslations("Site.footer");
  const instagram = process.env.NEXT_PUBLIC_INSTAGRAM_USERNAME;
  return (
    <footer className="mt-10 border-t border-border standalone:pb-[calc(env(safe-area-inset-bottom)+4rem)] md:standalone:pb-0">
      <div className="mx-auto max-w-[1800px] px-4 pb-8 pt-12 sm:px-6">
        <Link href="/contact" className="group inline-block">
          <span className="display display-xl block text-[22vw] lowercase leading-[0.8] transition-colors group-hover:text-rec sm:text-[16vw] lg:text-[13vw]">
            {t("sayHi")}{" "}
            <span className="inline-block transition-transform duration-300 group-hover:translate-x-4">→</span>
          </span>
        </Link>
        <p className="mt-4 max-w-md text-muted-foreground">{t("sayHiSub")}</p>

        <div className="readout mt-12 flex flex-col gap-4 text-muted-foreground sm:flex-row sm:items-center sm:justify-between">
          <span>{t("madeBy", { name })} · {new Date().getFullYear()}</span>
          <div className="flex flex-wrap gap-x-6 gap-y-2">
            <Link href="/kind-words" className="hover:text-foreground">{t("kindWords")}</Link>
            <Link href="/c" className="hover:text-foreground">{t("clientLogin")}</Link>
            {instagram && (
              <a href={`https://instagram.com/${instagram}`} target="_blank" rel="noopener noreferrer" className="hover:text-foreground">
                Instagram ↗
              </a>
            )}
            <Link href="/imprint" className="hover:text-foreground">{t("imprint")}</Link>
            <Link href="/privacy_policy" className="hover:text-foreground">{t("privacy")}</Link>
          </div>
        </div>
      </div>
    </footer>
  );
}
