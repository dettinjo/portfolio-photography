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
import { BalanceCard } from "@/components/portal/BalanceCard";
import { ShareLinks } from "@/components/portal/ShareLinks";
import { getPayloadClient } from "@/lib/payload";
import { refreshOpenPayments } from "@/lib/payments";
import { stripeEnabled } from "@/lib/stripe";

type Props = {
  params: Promise<{ locale: string; project: string }>;
  searchParams: Promise<{ payment?: string }>;
};

export default async function PhotosPage({ params, searchParams }: Props) {
  const { locale, project: slug } = await params;
  setRequestLocale(locale);
  const loc = toLocale(locale);
  const client = await getClient();
  if (!client) redirect(`${locale === "de" ? "/de" : ""}/c/login`);
  let project = await findClientProject(client, slug);
  if (!project) notFound();
  const { payment } = await searchParams;
  // Back from Stripe Checkout: confirm with Stripe directly in case the webhook is slower
  if (payment === "success") {
    await refreshOpenPayments(await getPayloadClient(), project.id);
    project = (await findClientProject(client, slug)) ?? project;
  }
  const t = await getTranslations("Portal.delivery");
  const b = await getTranslations("Portal.balance");
  const delivery = await getDelivery(project, client);
  const locked = Boolean(delivery.billing?.locked);
  const shared = delivery.open
    ? await (await getPayloadClient()).find({
        collection: "share-links",
        where: { and: [{ project: { equals: project.id } }, { revokedAt: { exists: false } }] },
        sort: "createdAt",
        limit: 50,
        depth: 0,
        overrideAccess: true,
      })
    : null;
  const links = (shared?.docs ?? []).map((l) => ({ id: l.id, label: l.label, token: l.token, downloads: Boolean(l.downloads), views: l.views ?? 0 }));

  return (
    <>
      <SectionLabel n={1} aside={<SignOut locale={locale} />}>
        {project.title}
      </SectionLabel>
      <ProjectNav slug={slug} projectId={project.id} active="photos" />
      <h1 className="display display-xl mt-10 text-6xl lowercase sm:text-8xl">{t("title")}</h1>

      {payment === "success" && (
        <p className="mt-8 border-l-2 border-rec pl-4" role="status">{locked ? b("success") : b("settled")}</p>
      )}
      {payment === "cancelled" && <p className="mt-8 border-l-2 border-border pl-4" role="status">{b("cancelled")}</p>}

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
            {!locked && (
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
            )}
          </div>
          {locked && delivery.billing && <BalanceCard billing={delivery.billing} slug={slug} locale={loc} online={stripeEnabled()} delivered />}
          <div className="mt-12">
            <DeliveryGallery slug={slug} photos={delivery.photos} revisions={delivery.revisions} rounds={delivery.rounds} />
          </div>
          <ShareLinks slug={slug} links={links} />
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
