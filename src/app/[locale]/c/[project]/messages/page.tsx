import { getTranslations, setRequestLocale } from "next-intl/server";
import { notFound, redirect } from "next/navigation";
import { SectionLabel } from "@/components/site/SectionLabel";
import { SignOut } from "@/components/portal/SignOut";
import { ProjectNav } from "@/components/portal/ProjectNav";
import { MessageThread } from "@/components/portal/MessageThread";
import { getClient } from "@/lib/client-session";
import { findClientProject, getThread, hasPreviews } from "@/lib/portal";

type Props = { params: Promise<{ locale: string; project: string }> };

export default async function MessagesPage({ params }: Props) {
  const { locale, project: slug } = await params;
  setRequestLocale(locale);
  const client = await getClient();
  if (!client) redirect(`${locale === "de" ? "/de" : ""}/c/login`);
  const project = await findClientProject(client, slug);
  if (!project) notFound();
  const t = await getTranslations("Portal.messages");
  const [items, previews] = await Promise.all([getThread(client, project), hasPreviews(project.id)]);

  return (
    <>
      <SectionLabel n={1} aside={<SignOut locale={locale} />}>
        {project.title}
      </SectionLabel>
      <ProjectNav slug={slug} active="messages" hasPreviews={previews} />
      <h1 className="display display-xl mt-10 text-6xl lowercase sm:text-8xl">{t("title")}</h1>
      <p className="mt-6 max-w-xl text-lg text-muted-foreground">{t("intro")}</p>
      <div className="mt-12 max-w-3xl">
        <MessageThread slug={slug} items={items} />
      </div>
    </>
  );
}
