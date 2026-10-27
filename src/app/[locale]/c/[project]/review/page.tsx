import { getTranslations, setRequestLocale } from "next-intl/server";
import { notFound, redirect } from "next/navigation";
import { SectionLabel } from "@/components/site/SectionLabel";
import { SignOut } from "@/components/portal/SignOut";
import { ProjectNav } from "@/components/portal/ProjectNav";
import { ReviewForm } from "@/components/portal/ReviewForm";
import { ConsentEditor } from "@/components/portal/ConsentEditor";
import { getClient } from "@/lib/client-session";
import { findClientProject, getDelivery, getFeedbackState } from "@/lib/portal";

type Props = { params: Promise<{ locale: string; project: string }> };

export default async function ReviewPage({ params }: Props) {
  const { locale, project: slug } = await params;
  setRequestLocale(locale);
  const client = await getClient();
  if (!client) redirect(`${locale === "de" ? "/de" : ""}/c/login`);
  const project = await findClientProject(client, slug);
  if (!project) notFound();
  const t = await getTranslations("Portal.review");
  const [delivery, state] = await Promise.all([getDelivery(project, client), getFeedbackState(client, project.id)]);
  const photos = delivery.photos.map((p) => ({ id: p.id, src: p.src.replace(/\/960$/, "/480"), filename: p.filename }));
  const consent = Object.fromEntries(delivery.photos.map((p) => [p.id, p.consent]));

  return (
    <>
      <SectionLabel n={1} aside={<SignOut locale={locale} />}>
        {project.title}
      </SectionLabel>
      <ProjectNav slug={slug} projectId={project.id} active="review" />
      <h1 className="display display-xl mt-10 text-6xl lowercase sm:text-8xl">{state.reviewed ? t("thanks") : t("title")}</h1>
      <p className="mt-6 max-w-xl text-lg text-muted-foreground">
        {!project.delivery?.deliveredAt ? t("notYet") : state.reviewed ? t("thanksText") : t("intro")}
      </p>

      {project.delivery?.deliveredAt && !state.reviewed && (
        <div className="mt-14 max-w-4xl">
          <ReviewForm slug={slug} photos={photos} defaultName={client.name} consent={consent} />
        </div>
      )}
      {state.reviewed && photos.length > 0 && (
        <section className="mt-14 max-w-4xl">
          <SectionLabel n={2}>{t("consentTitle")}</SectionLabel>
          <p className="mt-4 max-w-xl text-muted-foreground">{t("consentHelp")}</p>
          <div className="mt-6">
            <ConsentEditor slug={slug} photos={photos} consent={consent} />
          </div>
        </section>
      )}
    </>
  );
}
