import Link from "next/link";
import { StudioHeader } from "@/components/studio/StudioHeader";
import { ApproveReview, InquiryToProject, ReplyBox } from "@/components/studio/StudioActions";
import { PushToggle } from "@/components/portal/PushToggle";
import { getInbox, requireAdminPage } from "@/lib/studio";
import { DemoPanel } from "@/components/studio/DemoPanel";
import { demoState } from "@/lib/demo";
import { getPayloadClient } from "@/lib/payload";

export const metadata = { title: "Inbox" };

const when = (iso: string) =>
  new Intl.DateTimeFormat("en-GB", { dateStyle: "medium", timeStyle: "short", timeZone: "Europe/Berlin" }).format(new Date(iso));

function Section({ title, count, children }: { title: string; count: number; children: React.ReactNode }) {
  return (
    <section className="mt-10">
      <div className="readout flex items-center gap-3 text-muted-foreground">
        <span className="text-foreground">{title}</span>
        <span className="h-px flex-1 bg-border" aria-hidden />
        <span className={count ? "text-rec" : undefined}>{String(count).padStart(2, "0")}</span>
      </div>
      <div className="mt-4">{children}</div>
    </section>
  );
}

export default async function StudioInbox() {
  await requireAdminPage("/studio");
  const inbox = await getInbox();
  const demo = await demoState(await getPayloadClient());
  const empty = <p className="text-muted-foreground">Nothing waiting.</p>;

  return (
    <>
      <StudioHeader title="inbox" />
      <PushToggle labels={{ off: "Notify me on this phone", help: "Inquiries, messages, selections, changes and reviews." }} />

      <Section title="Messages to answer" count={inbox.unanswered.length}>
        {inbox.unanswered.length ? (
          <ul className="space-y-8">
            {inbox.unanswered.map((m) => (
              <li key={m.projectId}>
                <Link href={`/studio/projects/${m.projectId}`} className="readout text-muted-foreground hover:text-foreground">
                  {m.project} · {m.from} · {when(m.at)}
                </Link>
                <p className="mt-2 whitespace-pre-wrap bg-muted px-4 py-3">{m.body}</p>
                <ReplyBox projectId={m.projectId} />
              </li>
            ))}
          </ul>
        ) : empty}
      </Section>

      <Section title="New inquiries" count={inbox.inquiries.length}>
        {inbox.inquiries.length ? (
          <ul className="divide-y divide-border border-y border-border">
            {inbox.inquiries.map((i) => (
              <li key={i.id} className="py-4">
                <p className="text-lg">
                  {i.name}
                  {i.what && <span className="text-muted-foreground"> — {i.what}</span>}
                </p>
                <p className="readout mt-1 text-muted-foreground">
                  {[i.date?.slice(0, 10), i.location, when(i.at)].filter(Boolean).join(" · ")}
                </p>
                {i.message && <p className="mt-2 line-clamp-3 text-muted-foreground">{i.message}</p>}
                <div className="mt-3 flex flex-wrap gap-2">
                  <InquiryToProject id={i.id} />
                  <Link href={`/admin/collections/inquiries/${i.id}`} className="readout border border-border px-3 py-2 hover:border-foreground">Open ↗</Link>
                </div>
              </li>
            ))}
          </ul>
        ) : empty}
      </Section>

      <Section title="Change requests" count={inbox.changes.reduce((n, c) => n + c.count, 0)}>
        {inbox.changes.length ? (
          <ul className="space-y-2">
            {inbox.changes.map((c) => (
              <li key={c.projectId}>
                <Link href={`/studio/projects/${c.projectId}`} className="flex justify-between gap-4 border-b border-border py-2 hover:text-rec">
                  <span>{c.project}</span>
                  <span className="font-mono text-sm">{c.count} open</span>
                </Link>
              </li>
            ))}
          </ul>
        ) : empty}
      </Section>

      <Section title="Reviews to publish" count={inbox.reviews.length}>
        {inbox.reviews.length ? (
          <ul className="space-y-6">
            {inbox.reviews.map((r) => (
              <li key={r.id}>
                <blockquote className="accent-serif text-2xl leading-snug">“{r.quote}”</blockquote>
                <p className="readout mt-2 text-muted-foreground">
                  {r.name}
                  {r.project && ` · ${r.project}`}
                </p>
                <div className="mt-3 flex flex-wrap gap-2">
                  <ApproveReview id={r.id} />
                  <Link href={`/admin/collections/reviews/${r.id}`} className="readout border border-border px-3 py-2 hover:border-foreground">Series… ↗</Link>
                </div>
              </li>
            ))}
          </ul>
        ) : empty}
      </Section>

      <Section title="Recent feedback" count={inbox.feedback.length}>
        {inbox.feedback.length ? (
          <ul className="space-y-3">
            {inbox.feedback.map((f) => (
              <li key={f.id} className="border-b border-border pb-3">
                <p className="readout text-muted-foreground">
                  <span className="text-rec">{"★".repeat(f.rating)}{"☆".repeat(5 - f.rating)}</span> · {f.from} · {f.project} · {f.moment}
                </p>
                {f.comment && <p className="mt-1">{f.comment}</p>}
              </li>
            ))}
          </ul>
        ) : empty}
      </Section>
      <DemoPanel state={demo} />
    </>
  );
}
