import { getTranslations, setRequestLocale } from "next-intl/server";
import { notFound, redirect } from "next/navigation";
import { Link } from "@/i18n/navigation";
import { SectionLabel } from "@/components/site/SectionLabel";
import { SignOut } from "@/components/portal/SignOut";
import { ProofingGallery } from "@/components/portal/ProofingGallery";
import { getClient } from "@/lib/client-session";
import { formatDate, getProofing } from "@/lib/portal";
import { toLocale } from "@/lib/portfolio";
import { formatPrice } from "@/lib/sessions";

type Props = { params: Promise<{ locale: string; project: string }> };

export default async function ProofingPage({ params }: Props) {
  const { locale, project: slug } = await params;
  setRequestLocale(locale);
  const loc = toLocale(locale);
  const client = await getClient();
  if (!client) redirect(`${locale === "de" ? "/de" : ""}/c/login`);

  const proofing = await getProofing(client, slug);
  if (!proofing) notFound();
  const t = await getTranslations("Portal.proofing");
  const myName = client.name.split(" ")[0];
  const total = proofing.photos.filter((p) => proofing.pickedBy[p.id]?.length).length;

  return (
    <>
        <SectionLabel n={1} aside={<SignOut locale={locale} />}>
          <Link href={`/c/${slug}`} className="hover:text-foreground">
            ← {t("back")}
          </Link>
        </SectionLabel>
        <p className="readout mt-10 text-muted-foreground">{proofing.project.title}</p>
        <h1 className="display display-xl mt-2 max-w-[14ch] text-6xl lowercase sm:text-8xl">
          {proofing.submittedAt ? t("sentTitle") : t("title")}
        </h1>
        <p className="mt-6 max-w-xl text-lg text-muted-foreground">
          {proofing.submittedAt
            ? t("sentText", { count: total, date: formatDate(proofing.submittedAt, loc) })
            : proofing.photos.length
              ? t("intro")
              : t("noPreviews")}
        </p>

        {proofing.photos.length > 0 && (
          <ProofingGallery
            slug={slug}
            photos={proofing.photos}
            pickedBy={proofing.pickedBy}
            mine={proofing.mine}
            comments={proofing.comments}
            quota={proofing.quota}
            extraPrice={proofing.extraPrice ? formatPrice(proofing.extraPrice, loc) : null}
            myName={myName}
            locked={Boolean(proofing.submittedAt)}
          />
        )}
    </>
  );
}
