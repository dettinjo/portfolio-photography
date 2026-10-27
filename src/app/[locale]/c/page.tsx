import { getTranslations, setRequestLocale } from "next-intl/server";
import { redirect } from "next/navigation";
import { Link } from "@/i18n/navigation";
import { SectionLabel } from "@/components/site/SectionLabel";
import { SignOut } from "@/components/portal/SignOut";
import { getClient } from "@/lib/client-session";
import { formatDate, getClientProjects } from "@/lib/portal";
import { toLocale } from "@/lib/portfolio";

type Props = { params: Promise<{ locale: string }> };

export default async function PortalHome({ params }: Props) {
  const { locale } = await params;
  setRequestLocale(locale);
  const prefix = locale === "de" ? "/de" : "";
  const client = await getClient();
  if (!client) redirect(`${prefix}/c/login`);

  const projects = await getClientProjects(client);
  if (projects.length === 1) redirect(`${prefix}/c/${projects[0].slug}`);
  const t = await getTranslations("Portal");

  return (
    <>
      <SectionLabel n={1} aside={<SignOut locale={locale} />}>
        {t("label")}
      </SectionLabel>
      <h1 className="display display-xl mt-10 text-7xl lowercase sm:text-8xl">
        {t("home.hi", { name: client.name.split(" ")[0] })}
      </h1>
      <p className="readout mt-12 text-muted-foreground">{t("home.projects")}</p>
      {projects.length ? (
        <ul className="mt-4 divide-y divide-border border-y border-border">
          {projects.map((p) => (
            <li key={p.slug}>
              <Link href={`/c/${p.slug}`} className="group flex flex-wrap items-baseline gap-x-6 gap-y-1 py-5">
                <span className="display text-3xl lowercase transition group-hover:text-rec">{p.title}</span>
                <span className="readout text-muted-foreground">
                  {t(`stages.${p.stage}.label`)}
                  {p.shootDate && ` · ${formatDate(p.shootDate, toLocale(locale))}`}
                </span>
                <span className="ml-auto transition group-hover:translate-x-1">→</span>
              </Link>
            </li>
          ))}
        </ul>
      ) : (
        <p className="mt-4 max-w-md text-lg text-muted-foreground">{t("home.empty")}</p>
      )}
    </>
  );
}
