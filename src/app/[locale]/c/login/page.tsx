import { getTranslations, setRequestLocale } from "next-intl/server";
import { redirect } from "next/navigation";
import { Link } from "@/i18n/navigation";
import { LoginForm } from "@/components/portal/LoginForm";
import { SectionLabel } from "@/components/site/SectionLabel";
import { getClient } from "@/lib/client-session";

type Props = {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{ error?: string; signedOut?: string }>;
};

export default async function LoginPage({ params, searchParams }: Props) {
  const { locale } = await params;
  setRequestLocale(locale);
  if (await getClient()) redirect(`${locale === "de" ? "/de" : ""}/c`);
  const t = await getTranslations("Portal");
  const query = await searchParams;

  return (
    <>
      <SectionLabel n={1}>{t("label")}</SectionLabel>
      <div className="mt-10 grid gap-12 md:grid-cols-2 md:gap-16">
        <div>
          <h1 className="display display-xl text-7xl lowercase sm:text-8xl">{t("login.title")}</h1>
          <p className="mt-6 max-w-md text-lg text-muted-foreground">{t("login.intro")}</p>
          <Link href="/sessions#plan" className="link-slide mt-8 inline-block pb-0.5 text-muted-foreground">
            {t("login.noProject")}
          </Link>
        </div>
        <div className="md:pt-6">
          {query.error && (
            <p role="alert" className="mb-8 border-l-2 border-rec pl-4">
              {t("login.expired")}
            </p>
          )}
          {query.signedOut && !query.error && <p className="mb-8 border-l-2 border-border pl-4">{t("login.signedOut")}</p>}
          <LoginForm />
        </div>
      </div>
    </>
  );
}
