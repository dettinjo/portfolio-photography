import { getTranslations, setRequestLocale } from "next-intl/server";
import { notFound, redirect } from "next/navigation";
import { Download } from "lucide-react";
import { SectionLabel } from "@/components/site/SectionLabel";
import { SignOut } from "@/components/portal/SignOut";
import { ProjectNav } from "@/components/portal/ProjectNav";
import { DeliveryGallery } from "@/components/portal/DeliveryGallery";
import { getClient } from "@/lib/client-session";
import { findClientProject, formatBytes, formatDate, getDelivery } from "@/lib/portal";
import { toLocale } from "@/lib/portfolio";

type Props = { params: Promise<{ locale: string; project: string }> };

export default async function PhotosPage({ params }: Props) {
  const { locale, project: slug } = await params;
  setRequestLocale(locale);
  const loc = toLocale(locale);
  const client = await getClient();
  if (!client) redirect(`${locale === "de" ? "/de" : ""}/c/login`);
  const project = await findClientProject(client, slug);
  if (!project) notFound();
  const t = await getTranslations("Portal.delivery");
  const delivery = await getDelivery(project, client);

  return (
    <>
      <SectionLabel n={1} aside={<SignOut locale={locale} />}>
        {project.title}
      </SectionLabel>
      <ProjectNav slug={slug} projectId={project.id} active="photos" />
      <h1 className="display display-xl mt-10 text-6xl lowercase sm:text-8xl">{t("title")}</h1>

      {delivery.open && delivery.photos.length ? (
        <>
          <div className="mt-6 grid gap-8 md:grid-cols-[3fr_2fr] md:items-end">
            <div>
              <p className="max-w-xl text-lg text-muted-foreground">{t("intro")}</p>
              {delivery.expiresAt && (
                <p className="readout mt-4 text-rec">
                  <span className="rec-dot mr-2 align-middle" aria-hidden />
                  {t("until", { date: formatDate(delivery.expiresAt, loc) })}
                </p>
              )}
            </div>
            <div className="md:justify-self-end">
              <div className="flex flex-wrap items-center gap-3">
                <a
                  href={`/api/portal/download-all/${slug}/original`}
                  download
                  className="flex items-center gap-2 bg-foreground px-5 py-3 text-background transition hover:bg-rec hover:text-white"
                >
                  <Download className="h-4 w-4" /> {t("allOriginal")}
                </a>
                <a href={`/api/portal/download-all/${slug}/web`} download className="link-slide pb-0.5">
                  {t("allWeb")}
                </a>
              </div>
              <p className="readout mt-3 text-muted-foreground">
                {t("size", { count: delivery.photos.length, size: formatBytes(delivery.bytes, loc) })} · {t("zipHint")}
              </p>
            </div>
          </div>
          <div className="mt-12">
            <DeliveryGallery slug={slug} photos={delivery.photos} revisions={delivery.revisions} rounds={delivery.rounds} />
          </div>
        </>
      ) : (
        <p className="mt-6 max-w-xl text-lg text-muted-foreground">
          {delivery.purgedAt || (delivery.expiresAt && !delivery.open && delivery.deliveredAt)
            ? t("expired", { date: formatDate(delivery.expiresAt ?? delivery.purgedAt ?? "", loc) })
            : t("notYet")}
        </p>
      )}
    </>
  );
}
