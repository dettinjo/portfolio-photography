import { getTranslations, setRequestLocale } from "next-intl/server";
import type { Metadata } from "next";
import { Download } from "lucide-react";
import { SectionLabel } from "@/components/site/SectionLabel";
import { GuestGallery, type GuestPhoto } from "@/components/portal/GuestGallery";
import { getPayloadClient } from "@/lib/payload";
import { resolveShare } from "@/lib/share";
import { formatDate } from "@/lib/portal";
import { toLocale } from "@/lib/portfolio";

// A guest link to a delivered gallery: no sign-in, the token is the key.
export const dynamic = "force-dynamic";

type Props = { params: Promise<{ locale: string; token: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "Portal.guest" });
  // Private: not indexed, and the link never leaks through the Referer header
  return { title: t("metaTitle"), robots: { index: false, follow: false }, referrer: "no-referrer" };
}

export default async function GuestPage({ params }: Props) {
  const { locale, token } = await params;
  setRequestLocale(locale);
  const loc = toLocale(locale);
  const t = await getTranslations("Portal.guest");
  const payload = await getPayloadClient();
  const share = await resolveShare(payload, token);

  if (!share) {
    return (
      <>
        <SectionLabel n={1}>{t("label")}</SectionLabel>
        <h1 className="display display-xl mt-10 text-6xl lowercase sm:text-8xl">{t("goneTitle")}</h1>
        <p className="mt-6 max-w-xl text-lg text-muted-foreground">{t("gone")}</p>
      </>
    );
  }

  const { link, project, canDownload } = share;
  await payload.update({
    collection: "share-links",
    id: link.id,
    data: { views: (link.views ?? 0) + 1, lastViewedAt: new Date().toISOString() },
    overrideAccess: true,
  });
  const finals = await payload.find({
    collection: "photos",
    where: { and: [{ project: { equals: project.id } }, { purpose: { equals: "final" } }, { status: { equals: "ready" } }] },
    sort: ["order", "filename"],
    limit: 0,
    pagination: false,
    depth: 0,
    overrideAccess: true,
  });
  const base = `/api/share/${link.token}`;
  const photos: GuestPhoto[] = finals.docs.map((p) => ({
    id: p.id,
    filename: p.filename,
    width: p.width ?? 1600,
    height: p.height ?? 1067,
    placeholder: p.placeholder ?? null,
    color: p.color ?? null,
    src: `${base}/${p.id}/960`,
    srcSet: [480, 960, 1600].map((w) => `${base}/${p.id}/${w} ${w}w`).join(", "),
    large: `${base}/${p.id}/1600`,
    download: canDownload ? `${base}/${p.id}/download` : null,
  }));
  const clientId = typeof link.createdBy === "object" ? link.createdBy?.id : link.createdBy;
  const by = clientId ? await payload.findByID({ collection: "clients", id: clientId, depth: 0, overrideAccess: true }).catch(() => null) : null;

  return (
    <>
      <SectionLabel n={1} aside={String(photos.length).padStart(3, "0")}>
        {t("label")}
      </SectionLabel>
      <div className="mt-10 grid gap-8 md:grid-cols-[3fr_2fr] md:items-end">
        <div>
          <h1 className="display display-xl text-6xl lowercase sm:text-8xl">{project.title}</h1>
          <p className="mt-6 max-w-xl text-lg text-muted-foreground">
            {by ? t("sharedBy", { name: by.name.split(" ")[0] }) : t("shared")}
          </p>
          {project.delivery?.expiresAt && <p className="readout mt-4 text-muted-foreground">{t("until", { date: formatDate(project.delivery.expiresAt, loc) })}</p>}
        </div>
        {canDownload && photos.length > 0 && (
          <div className="md:justify-self-end">
            <a href={`${base}/zip`} download className="flex items-center gap-2 bg-foreground px-5 py-3 text-background transition hover:bg-rec hover:text-white">
              <Download className="h-4 w-4" /> {t("all")}
            </a>
          </div>
        )}
      </div>
      <div className="mt-12">
        <GuestGallery photos={photos} />
      </div>
    </>
  );
}
