import { getTranslations } from "next-intl/server";
import type { Billing } from "@/lib/billing";
import { formatCents } from "@/lib/proposal";
import { PayBalance } from "@/components/portal/PayBalance";

// What is still open after the deposit, and the button to pay it. On the
// photos page it explains why the downloads wait.
export async function BalanceCard({ billing, slug, locale, online, delivered }: { billing: Billing; slug: string; locale: "en" | "de"; online: boolean; delivered: boolean }) {
  const t = await getTranslations("Portal.balance");
  const eur = (c: number) => formatCents(c, locale);
  const rows: [string, string][] = [
    [t("total"), eur(billing.totalCents)],
    ...(billing.extras > 0 ? [[t("extras", { count: billing.extras, price: eur(billing.extraUnitCents) }), eur(billing.extrasCents)] as [string, string]] : []),
    [t("paid"), `− ${eur(billing.paidCents)}`],
    ...(billing.pendingCents > 0 ? [[t("pending"), eur(billing.pendingCents)] as [string, string]] : []),
  ];

  return (
    <section className="mt-10 border border-rec p-5 sm:p-6" aria-labelledby="balance-title">
      <p className="readout text-rec">{t("label")}</p>
      <div className="mt-2 flex flex-wrap items-baseline justify-between gap-x-6 gap-y-2">
        <h2 id="balance-title" className="display text-4xl lowercase">{t("title")}</h2>
        <p className="font-mono text-2xl">
          <span className="sr-only">{t("due")}: </span>
          {eur(billing.dueCents)}
        </p>
      </div>
      <dl className="mt-5 space-y-2 border-t border-border pt-4">
        {rows.map(([k, v]) => (
          <div key={k} className="flex flex-wrap justify-between gap-x-6">
            <dt className="text-muted-foreground">{k}</dt>
            <dd className="font-mono text-sm">{v}</dd>
          </div>
        ))}
        <div className="flex flex-wrap justify-between gap-x-6 border-t border-border pt-2">
          <dt>{t("due")}</dt>
          <dd className="font-mono text-sm">{eur(billing.dueCents)}</dd>
        </div>
      </dl>
      <p className="mt-5 max-w-xl">{delivered && billing.locked ? t("locked") : t("before")}</p>
      {billing.pendingCents > 0 ? (
        <p className="mt-4 border-l-2 border-rec pl-4">{t("processing")}</p>
      ) : online ? (
        <PayBalance slug={slug} label={t("pay", { amount: eur(billing.dueCents) })} />
      ) : (
        <p className="mt-4 border-l-2 border-border pl-4 text-muted-foreground">{t("manual")}</p>
      )}
    </section>
  );
}
