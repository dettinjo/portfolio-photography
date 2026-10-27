import { getTranslations, setRequestLocale } from "next-intl/server";
import { notFound, redirect } from "next/navigation";
import { Link } from "@/i18n/navigation";
import { SectionLabel } from "@/components/site/SectionLabel";
import { ProjectTimeline } from "@/components/portal/ProjectTimeline";
import { SignOut } from "@/components/portal/SignOut";
import { getClient } from "@/lib/client-session";
import { formatDate, getClientProject, getClientProjects, getProofing } from "@/lib/portal";
import { toLocale } from "@/lib/portfolio";

type Props = { params: Promise<{ locale: string; project: string }> };

export default async function ProjectPage({ params }: Props) {
  const { locale, project: slug } = await params;
  setRequestLocale(locale);
  const loc = toLocale(locale);
  const client = await getClient();
  if (!client) redirect(`${locale === "de" ? "/de" : ""}/c/login`);

  const project = await getClientProject(client, slug, loc);
  if (!project) notFound();
  const hasOthers = (await getClientProjects(client)).length > 1;
  const proofing = await getProofing(client, slug);
  const t = await getTranslations("Portal");

  const details: [string, string | null][] = [
    [t("project.shoot"), project.shootDate ? formatDate(project.shootDate, loc, true) : null],
    [t("project.location"), project.location],
    [t("project.offering"), project.offering],
    ...project.keyDates.map((d): [string, string] => [d.label, formatDate(d.date, loc)]),
  ];

  return (
    <>
      <SectionLabel n={1} aside={<SignOut locale={locale} />}>
        {hasOthers ? (
          <Link href="/c" className="hover:text-foreground">
            ← {t("project.back")}
          </Link>
        ) : (
          t("label")
        )}
      </SectionLabel>

      <p className="readout mt-10 text-muted-foreground">{t("home.hi", { name: client.name.split(" ")[0] })}</p>
      <h1 className="display display-xl mt-2 text-6xl lowercase sm:text-8xl">{project.title}</h1>

      {/* The one thing that matters now */}
      <section className="mt-12 grid gap-8 border-y border-border py-10 md:grid-cols-[1fr_2fr]">
        <div>
          <p className="readout text-muted-foreground">{t("project.nextStep")}</p>
          <p className="display mt-2 text-4xl lowercase">
            <span className="rec-dot mr-3 align-middle" aria-hidden />
            {t(`stages.${project.stage}.label`)}
          </p>
        </div>
        <div className="space-y-3 text-xl leading-relaxed">
          {(project.nextStep ?? t(`stages.${project.stage}.next`)).split(/\n\s*\n/).map((p) => (
            <p key={p}>{p}</p>
          ))}
        </div>
      </section>

      {proofing && proofing.photos.length > 0 && (
        <Link
          href={`/c/${slug}/proofing`}
          className="group mt-10 flex flex-col gap-6 border border-border p-4 transition hover:border-foreground sm:flex-row sm:items-center"
        >
          <div className="flex shrink-0 -space-x-6">
            {proofing.photos.slice(0, 4).map((p, i) => (
              // eslint-disable-next-line @next/next/no-img-element -- access-checked /api/previews
              <img
                key={p.id}
                src={p.src.replace(/\/960$/, "/480")}
                alt=""
                className="h-20 w-20 border-2 border-background object-cover shadow transition group-hover:rotate-0"
                style={{ transform: `rotate(${[-6, 3, -2, 5][i]}deg)` }}
              />
            ))}
          </div>
          <div className="flex-1">
            <p className="readout text-muted-foreground">{t("proofing.previewsTitle")}</p>
            <p className="display mt-1 text-3xl lowercase">
              {proofing.submittedAt ? t("proofing.sentTitle") : t("proofing.previewsText", { count: proofing.photos.length })}
            </p>
          </div>
          <span className="bg-foreground px-5 py-2.5 text-background transition group-hover:bg-rec group-hover:text-white">
            {t("proofing.open")} →
          </span>
        </Link>
      )}

      <section className="mt-16">
        <SectionLabel n={2}>{t("project.timeline")}</SectionLabel>
        <div className="mt-6">
          <ProjectTimeline stage={project.stage} />
        </div>
      </section>

      <div className="mt-16 grid gap-16 md:grid-cols-2">
        <section>
          <SectionLabel n={3}>{t("project.details")}</SectionLabel>
          <dl className="mt-6 space-y-5">
            {details
              .filter(([, v]) => v)
              .map(([k, v]) => (
                <div key={k} className="flex flex-wrap items-baseline justify-between gap-x-6 gap-y-1 border-b border-border pb-3">
                  <dt className="readout text-muted-foreground">{k}</dt>
                  <dd className="text-lg">{v}</dd>
                </div>
              ))}
          </dl>
        </section>

        {project.activity.length > 0 && (
          <section>
            <SectionLabel n={4}>{t("project.activity")}</SectionLabel>
            <ol className="mt-6 space-y-4">
              {project.activity.map((a) => (
                <li key={a.id} className="flex gap-4">
                  <span className="readout w-28 shrink-0 pt-1 text-muted-foreground">{formatDate(a.createdAt, loc)}</span>
                  <span className="text-lg">
                    {a.stage ? t("project.movedTo", { stage: t(`stages.${a.stage}.label`) }) : a.message}
                  </span>
                </li>
              ))}
            </ol>
          </section>
        )}
      </div>

      <p className="mt-20 text-muted-foreground">
        {t("project.questions")}{" "}
        <Link href="/contact" className="link-slide text-foreground">
          {t("project.write")} →
        </Link>
      </p>
    </>
  );
}
