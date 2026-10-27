import { getTranslations, setRequestLocale } from "next-intl/server";
import { notFound, redirect } from "next/navigation";
import { SectionLabel } from "@/components/site/SectionLabel";
import { SignOut } from "@/components/portal/SignOut";
import { ProjectNav } from "@/components/portal/ProjectNav";
import { PlanEditor } from "@/components/portal/PlanEditor";
import { Moodboard } from "@/components/portal/Moodboard";
import { getClient } from "@/lib/client-session";
import { findClientProject, formatDate, getMoodboard } from "@/lib/portal";
import { planLocked, planQuestions } from "@/lib/plan";
import { toLocale } from "@/lib/portfolio";

type Props = { params: Promise<{ locale: string; project: string }> };

export default async function PlanPage({ params }: Props) {
  const { locale, project: slug } = await params;
  setRequestLocale(locale);
  const loc = toLocale(locale);
  const client = await getClient();
  if (!client) redirect(`${locale === "de" ? "/de" : ""}/c/login`);
  const project = await findClientProject(client, slug);
  if (!project) notFound();

  const t = await getTranslations("Portal.plan");
  const [questions, moodboard] = await Promise.all([planQuestions(project, loc), getMoodboard(client, project.id)]);
  const saved = project.plan?.answers ?? [];
  // Keep answers attached to their question text, even if the order changed
  const answers = questions.map((q) => saved.find((a) => a.question === q.question)?.answer ?? "");
  const locked = planLocked(project);
  const schedule = project.plan?.schedule ?? [];
  const meetingPoint = project.plan?.meetingPoint;

  return (
    <>
      <SectionLabel n={1} aside={<SignOut locale={locale} />}>
        {project.title}
      </SectionLabel>
      <ProjectNav slug={slug} projectId={project.id} active="plan" />
      <h1 className="display display-xl mt-10 text-6xl lowercase sm:text-8xl">{t("title")}</h1>
      <p className="mt-6 max-w-xl text-lg text-muted-foreground">{locked ? t("locked") : t("intro")}</p>

      {(project.shootDate || project.location || meetingPoint || schedule.length > 0) && (
        <section className="mt-14 grid gap-8 border-y border-border py-8 md:grid-cols-[1fr_2fr]">
          <div className="space-y-4">
            {project.shootDate && <p className="display text-3xl lowercase">{formatDate(project.shootDate, loc, true)}</p>}
            {project.location && <p className="text-lg">{project.location}</p>}
            {meetingPoint && (
              <p>
                <span className="readout block text-muted-foreground">{t("meetingPoint")}</span>
                {meetingPoint}
              </p>
            )}
          </div>
          {schedule.length > 0 && (
            <div>
              <p className="readout text-muted-foreground">{t("day")}</p>
              <ol className="mt-3 space-y-2">
                {schedule.map((s, i) => (
                  <li key={i} className="flex gap-4 text-lg">
                    <span className="w-16 shrink-0 font-mono text-sm leading-7 text-rec">{s.time}</span>
                    {s.item}
                  </li>
                ))}
              </ol>
            </div>
          )}
        </section>
      )}

      <div className="mt-16 grid gap-16 lg:grid-cols-[3fr_2fr]">
        <section>
          <SectionLabel n={2}>{t("questions")}</SectionLabel>
          <div className="mt-8">
            <PlanEditor slug={slug} questions={questions} answers={answers} shotList={(project.plan?.shotList ?? []).map((s) => ({ item: s.item, done: Boolean(s.done) }))} locked={locked} />
          </div>
        </section>
        <section>
          <SectionLabel n={3}>
            {t("moodboard")}
          </SectionLabel>
          <p className="mt-6 text-muted-foreground">{t("moodboardHelp")}</p>
          <div className="mt-6">
            <Moodboard slug={slug} images={moodboard} locked={locked} />
          </div>
        </section>
      </div>
    </>
  );
}
