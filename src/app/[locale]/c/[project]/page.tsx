import { getTranslations, setRequestLocale } from "next-intl/server";
import { notFound, redirect } from "next/navigation";
import { Link } from "@/i18n/navigation";
import { SectionLabel } from "@/components/site/SectionLabel";
import { ProjectTimeline } from "@/components/portal/ProjectTimeline";
import { ProposalCard } from "@/components/portal/ProposalCard";
import { ProjectNav } from "@/components/portal/ProjectNav";
import { FeedbackCard } from "@/components/portal/FeedbackCard";
import { stageIndex } from "@/lib/stages";
import { SignOut } from "@/components/portal/SignOut";
import { getClient } from "@/lib/client-session";
import { findClientProject, formatDate, getClientProject, getClientProjects, getDelivery, getFeedbackState, getProofing } from "@/lib/portal";
import { toLocale } from "@/lib/portfolio";
import { getPayloadClient } from "@/lib/payload";
import { refreshOpenPayments } from "@/lib/payments";
import { formatCents } from "@/lib/proposal";
import { stripeEnabled } from "@/lib/stripe";

type Props = {
  params: Promise<{ locale: string; project: string }>;
  searchParams: Promise<{ payment?: string }>;
};

export default async function ProjectPage({ params, searchParams }: Props) {
  const { locale, project: slug } = await params;
  setRequestLocale(locale);
  const loc = toLocale(locale);
  const client = await getClient();
  if (!client) redirect(`${locale === "de" ? "/de" : ""}/c/login`);

  const { payment } = await searchParams;
  let project = await getClientProject(client, slug, loc);
  if (!project) notFound();
  // Back from Stripe Checkout: confirm with Stripe directly in case the webhook is slower
  if (payment === "success") {
    await refreshOpenPayments(await getPayloadClient(), project.id);
    project = (await getClientProject(client, slug, loc)) ?? project;
  }
  const hasOthers = (await getClientProjects(client)).length > 1;
  const proofing = await getProofing(client, slug);
  const rawProject = await findClientProject(client, slug);
  const delivery = rawProject ? await getDelivery(rawProject) : null;
  const feedback = await getFeedbackState(client, project.id);
  const at = stageIndex(project.stage);
  // One gentle ask at a time: review after delivery, else the sneak peek, else booking
  const ask: "review" | "sneak-peek" | "booking" | null =
    rawProject?.delivery?.deliveredAt && !feedback.reviewed
      ? "review"
      : proofing?.photos.length && !feedback.sneakPeek && at >= stageIndex("sneak-peek") && at < stageIndex("delivery")
        ? "sneak-peek"
        : !feedback.booking && at >= stageIndex("booked") && at < stageIndex("sneak-peek")
          ? "booking"
          : null;
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

      <ProjectNav slug={slug} projectId={project.id} active="overview" />

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

      {payment === "success" && !project.payments.some((x) => x.status === "paid" || x.status === "processing") && (
        <p className="mt-8 border-l-2 border-rec pl-4" role="status">{t("proposal.success")}</p>
      )}
      {payment === "cancelled" && <p className="mt-8 border-l-2 border-border pl-4" role="status">{t("proposal.cancelled")}</p>}

      <ProposalCard project={project} locale={loc} online={stripeEnabled()} />

      {ask === "review" ? (
        <Link href={`/c/${slug}/review`} className="group mt-10 flex flex-wrap items-center justify-between gap-4 border border-rec p-5 transition hover:bg-rec hover:text-white">
          <span>
            <span className="readout block text-rec group-hover:text-white">{t("review.label")}</span>
            <span className="display mt-1 block text-3xl lowercase">{t("review.card")}</span>
          </span>
          <span className="whitespace-nowrap">{t("review.open")} →</span>
        </Link>
      ) : ask ? (
        <FeedbackCard slug={slug} moment={ask} />
      ) : null}

      {delivery?.open && delivery.photos.length > 0 && (
        <Link
          href={`/c/${slug}/photos`}
          className="group mt-10 flex flex-col gap-6 bg-foreground p-4 text-background transition hover:bg-rec sm:flex-row sm:items-center"
        >
          <div className="flex shrink-0 -space-x-6">
            {delivery.photos.slice(0, 4).map((p, i) => (
              // eslint-disable-next-line @next/next/no-img-element -- access-checked /api/previews
              <img
                key={p.id}
                src={p.src.replace(/\/960$/, "/480")}
                alt=""
                className="h-20 w-20 border-2 border-background object-cover shadow"
                style={{ transform: `rotate(${[-6, 3, -2, 5][i]}deg)` }}
              />
            ))}
          </div>
          <div className="flex-1">
            <p className="readout opacity-70">{t("delivery.label")}</p>
            <p className="display mt-1 text-3xl lowercase">{t("delivery.card", { count: delivery.photos.length })}</p>
            {delivery.expiresAt && <p className="readout mt-1 opacity-70">{t("delivery.until", { date: formatDate(delivery.expiresAt, loc) })}</p>}
          </div>
          <span className="border border-background px-5 py-2.5">{t("delivery.open")} →</span>
        </Link>
      )}

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

        {project.payments.length > 0 && (
          <section>
            <SectionLabel n={5}>{t("proposal.payments")}</SectionLabel>
            <ul className="mt-6 space-y-3">
              {project.payments.map((x) => (
                <li key={x.id} className="flex flex-wrap items-baseline justify-between gap-x-6 gap-y-1 border-b border-border pb-3">
                  <span>{x.label}</span>
                  <span className="font-mono text-sm">
                    {formatCents(x.amount, loc)} · {t(`proposal.status.${x.status}`)}
                    {x.paidAt && ` · ${formatDate(x.paidAt, loc)}`}
                  </span>
                </li>
              ))}
            </ul>
          </section>
        )}

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
