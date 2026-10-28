import { StudioHeader } from "@/components/studio/StudioHeader";
import { requireAdminPage } from "@/lib/studio";
import { getPayloadClient } from "@/lib/payload";
import { getStats, type MonthPoint } from "@/lib/stats";
import { formatCents } from "@/lib/proposal";
import { STAGE_LABELS } from "@/lib/stages";

export const metadata = { title: "Stats" };
export const dynamic = "force-dynamic";

const eur = (c: number) => formatCents(c, "en");
const monthLabel = (key: string) => new Intl.DateTimeFormat("en-GB", { month: "short", timeZone: "UTC" }).format(new Date(`${key}-15T00:00:00Z`));

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="mt-10">
      <div className="readout flex items-center gap-3 text-muted-foreground">
        <span className="text-foreground">{title}</span>
        <span className="h-px flex-1 bg-border" aria-hidden />
      </div>
      <div className="mt-4">{children}</div>
    </section>
  );
}

function Figure({ label, value, note }: { label: string; value: string; note?: string }) {
  return (
    <div className="min-w-0">
      <dt className="readout text-muted-foreground">{label}</dt>
      <dd className="display mt-1 truncate text-3xl">{value}</dd>
      {note && <dd className="readout mt-1 text-muted-foreground">{note}</dd>}
    </div>
  );
}

/** Twelve bars; the current month is red. Values also as text for screen readers. */
function Bars({ months, value, format = String, label }: { months: MonthPoint[]; value: (m: MonthPoint) => number; format?: (n: number) => string; label: string }) {
  const max = Math.max(1, ...months.map(value));
  return (
    <figure>
      <div className="flex h-32 items-end gap-1" role="img" aria-label={`${label}: ${months.map((m) => `${monthLabel(m.key)} ${format(value(m))}`).join(", ")}`}>
        {months.map((m, i) => {
          const v = value(m);
          return (
            <div key={m.key} className="group relative flex h-full flex-1 flex-col justify-end">
              <span className="readout pointer-events-none absolute -top-5 left-1/2 hidden -translate-x-1/2 whitespace-nowrap group-hover:block">{format(v)}</span>
              <div className={i === months.length - 1 ? "bg-rec" : "bg-foreground"} style={{ height: `${v ? Math.max(4, (v / max) * 100) : 0}%` }} />
              {!v && <div className="h-px bg-border" />}
            </div>
          );
        })}
      </div>
      <div className="mt-2 flex gap-1">
        {months.map((m, i) => (
          <span key={m.key} className="readout flex-1 text-center text-[10px] text-muted-foreground">
            {(months.length - 1 - i) % 2 === 0 ? monthLabel(m.key).slice(0, 1) : ""}
            <span className="sr-only">{monthLabel(m.key)}</span>
          </span>
        ))}
      </div>
    </figure>
  );
}

export default async function StudioStats() {
  await requireAdminPage("/studio/stats");
  const s = await getStats(await getPayloadClient());
  const { totals: t, galleries: g, feeling: f } = s;
  const maxStage = Math.max(1, ...s.pipeline.map((p) => p.count));

  return (
    <>
      <StudioHeader title="stats" />
      <p className="readout text-muted-foreground">Last 12 months · visitors are in Umami</p>

      <dl className="mt-8 grid grid-cols-2 gap-x-6 gap-y-6 border-y border-border py-6 sm:grid-cols-4">
        <Figure label="Inquiries" value={String(t.inquiries)} note={t.conversion === null ? undefined : `${t.conversion} % became projects`} />
        <Figure label="Booked" value={String(t.bookings)} />
        <Figure label="Received" value={eur(t.revenueCents)} note={`${eur(t.revenueYearCents)} this year`} />
        <Figure label="Still open" value={eur(t.openCents)} note={t.pendingCents ? `${eur(t.pendingCents)} on its way` : undefined} />
      </dl>

      <Section title="Inquiries per month">
        <Bars months={s.months} value={(m) => m.inquiries} label="Inquiries per month" />
      </Section>
      <Section title="Bookings per month">
        <Bars months={s.months} value={(m) => m.bookings} label="Bookings per month" />
      </Section>
      <Section title="Received per month">
        <Bars months={s.months} value={(m) => m.revenueCents} format={eur} label="Received per month" />
      </Section>

      <Section title="Projects by stage">
        <ul className="space-y-2">
          {s.pipeline.map((p) => (
            <li key={p.stage} className="grid grid-cols-[7rem_1fr_2rem] items-center gap-3 text-sm">
              <span className={p.count ? "" : "text-muted-foreground"}>{STAGE_LABELS[p.stage]}</span>
              <span className="h-2 bg-muted">
                <span className="block h-full bg-foreground" style={{ width: `${(p.count / maxStage) * 100}%` }} />
              </span>
              <span className="text-right font-mono">{p.count}</span>
            </li>
          ))}
        </ul>
      </Section>

      {s.offerings.length > 0 && (
        <Section title="By offering">
          <table className="w-full text-sm">
            <thead>
              <tr className="readout text-left text-muted-foreground">
                <th className="py-1 font-normal">Offering</th>
                <th className="py-1 text-right font-normal">Inquiries</th>
                <th className="py-1 text-right font-normal">Projects</th>
              </tr>
            </thead>
            <tbody>
              {s.offerings.map((o) => (
                <tr key={o.title} className="border-t border-border">
                  <td className="py-2">{o.title}</td>
                  <td className="py-2 text-right font-mono">{o.inquiries}</td>
                  <td className="py-2 text-right font-mono">{o.projects}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </Section>
      )}

      <Section title="Galleries">
        <dl className="grid grid-cols-2 gap-x-6 gap-y-6 sm:grid-cols-4">
          <Figure label="Online" value={String(g.online)} note={g.expiringSoon ? `${g.expiringSoon} close within 30 days` : undefined} />
          <Figure label="ZIP downloads" value={String(g.zipDownloads)} />
          <Figure label="Guest links" value={String(g.guestLinks)} />
          <Figure label="Guest views" value={String(g.guestViews)} />
        </dl>
      </Section>

      <Section title="How it felt">
        <dl className="grid grid-cols-2 gap-x-6 gap-y-6 sm:grid-cols-4">
          <Figure label="Feedback" value={f.feedbackAvg === null ? "—" : `${f.feedbackAvg} / 5`} note={`${f.feedbackCount} answers`} />
          <Figure label="Reviews" value={f.reviewAvg === null ? "—" : `${f.reviewAvg} / 5`} note={`${f.reviewCount} · ${f.approved} published`} />
        </dl>
      </Section>
    </>
  );
}
