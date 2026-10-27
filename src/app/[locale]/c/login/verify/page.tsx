import { getTranslations, setRequestLocale } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { SectionLabel } from "@/components/site/SectionLabel";

// Opened from the email. Signing in needs a click (POST), so mail scanners that
// open links in advance cannot use the one-time token.
type Props = {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{ token?: string }>;
};

export default async function VerifyPage({ params, searchParams }: Props) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations("Portal");
  const { token } = await searchParams;

  return (
    <>
      <SectionLabel n={1}>{t("label")}</SectionLabel>
      <h1 className="display display-xl mt-10 max-w-[14ch] text-7xl lowercase sm:text-8xl">{t("verify.title")}</h1>
      {token ? (
        <form method="post" action="/api/client-auth/verify" className="mt-10">
          <input type="hidden" name="token" value={token} />
          <input type="hidden" name="locale" value={locale} />
          <p className="max-w-md text-lg text-muted-foreground">{t("verify.text")}</p>
          <button
            type="submit"
            autoFocus
            className="mt-8 bg-foreground px-8 py-4 text-lg text-background transition hover:bg-rec hover:text-white"
          >
            {t("verify.button")} →
          </button>
        </form>
      ) : (
        <p className="mt-10 text-lg">
          {t("verify.missing")}{" "}
          <Link href="/c/login" className="link-slide">
            →
          </Link>
        </p>
      )}
    </>
  );
}
