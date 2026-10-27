import { getTranslations } from "next-intl/server";

export async function SignOut({ locale }: { locale: string }) {
  const t = await getTranslations("Portal.home");
  return (
    <form method="post" action="/api/client-auth/logout">
      <input type="hidden" name="locale" value={locale} />
      <button type="submit" className="readout text-muted-foreground transition hover:text-rec">
        {t("signOut")} ↗
      </button>
    </form>
  );
}
