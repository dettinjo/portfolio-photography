import { getTranslations } from "next-intl/server";
import type { PortalProject } from "@/lib/portal";
import { formatDate } from "@/lib/portal";
import { formatCents } from "@/lib/proposal";
import type { Locale } from "@/lib/portfolio";
import { AcceptProposal } from "./AcceptProposal";
import { taxNote } from "@/lib/tax";

// The proposal as a receipt-like slip: lines, total, deposit, and the one
// action that books the date.
export async function ProposalCard({ project, locale, online }: { project: PortalProject; locale: Locale; online: boolean }) {
  const t = await getTranslations("Portal.proposal");
  const p = project.proposal;
  if (!p) return null;
  const money = (c: number) => formatCents(c, locale);
  const tax = await taxNote(p.totalCents, locale === "de" ? "de" : "en");
  const deposit = project.payments.find((x) => x.kind === "deposit" && ["paid", "processing", "partially_refunded"].includes(x.status));

  return (
    <section className="mt-12 grid gap-8 md:grid-cols-[1fr_2fr]" id="proposal">
      <div>
        <p className="readout text-muted-foreground">{t("label")}</p>
        <h2 className="display mt-2 text-5xl lowercase">{t("title")}</h2>
      </div>
      <div className="-rotate-[0.6deg] bg-[#fbfaf7] p-6 text-neutral-900 shadow-[0_12px_30px_-12px_rgba(0,0,0,0.35)] sm:p-8">
        {p.note && <p className="mb-6 whitespace-pre-line text-lg">{p.note}</p>}
        <dl className="font-mono text-sm">
          {p.lines.map((l, i) => (
            <div key={i} className="flex items-baseline gap-3 py-1.5">
              <dt>{l.label}</dt>
              <span className="flex-1 border-b border-dotted border-neutral-400" aria-hidden />
              <dd>{money(l.cents)}</dd>
            </div>
          ))}
          <div className="mt-2 flex items-baseline justify-between border-t-2 border-neutral-900 pt-3 text-base font-semibold">
            <dt>{t("total")}</dt>
            <dd>{money(p.totalCents)}</dd>
          </div>
          <div className="flex items-baseline justify-between pt-2 text-[hsl(var(--rec))]">
            <dt>{p.depositPercent !== null ? t("depositPercent", { percent: p.depositPercent }) : t("deposit")}</dt>
            <dd>{money(p.depositCents)}</dd>
          </div>
        </dl>
        <p className="readout mt-4 text-neutral-500">
          {t("rest")} {tax}
        </p>

        {deposit ? (
          <p className="mt-8 border-l-2 border-[hsl(var(--rec))] pl-4 text-lg">
            {deposit.status === "processing"
              ? t("processing")
              : t("paid", { amount: money(deposit.amount), date: deposit.paidAt ? formatDate(deposit.paidAt, locale) : "" })}
          </p>
        ) : p.acceptedAt && !online ? (
          <p className="mt-8 border-l-2 border-neutral-400 pl-4 text-lg">
            {t("accepted", { date: formatDate(p.acceptedAt, locale) })} {t("manual")}
          </p>
        ) : (
          <>
            {p.acceptedAt && <p className="mt-6 text-neutral-500">{t("accepted", { date: formatDate(p.acceptedAt, locale) })}</p>}
            <AcceptProposal slug={project.slug} amount={money(p.depositCents)} payOnly={Boolean(p.acceptedAt)} online={online} />
          </>
        )}
      </div>
    </section>
  );
}
