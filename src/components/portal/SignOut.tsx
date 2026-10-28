import { getTranslations } from "next-intl/server";
import { SignOutButton } from "@/components/portal/SignOutButton";

export async function SignOut({ locale }: { locale: string }) {
  const t = await getTranslations("Portal.home");
  return (
    <form method="post" action="/api/client-auth/logout">
      <input type="hidden" name="locale" value={locale} />
      <SignOutButton label={t("signOut")} />
    </form>
  );
}
