import Link from "next/link";
import { StudioHeader } from "@/components/studio/StudioHeader";
import { requireAdminPage } from "@/lib/studio";
import { getPayloadClient } from "@/lib/payload";
import { STAGES, STAGE_LABELS, isStage } from "@/lib/stages";

export const metadata = { title: "Projects" };

export default async function StudioProjects() {
  await requireAdminPage("/studio/projects");
  const payload = await getPayloadClient();
  const projects = await payload.find({ collection: "projects", sort: "shootDate", limit: 500, depth: 1, overrideAccess: true });
  const byStage = STAGES.map((stage) => ({ stage, items: projects.docs.filter((p) => (isStage(p.stage) ? p.stage : "proposal") === stage) })).filter((g) => g.items.length);

  return (
    <>
      <StudioHeader title="projects" />
      {byStage.length ? (
        byStage.map(({ stage, items }) => (
          <details key={stage} open={stage !== "archive"} className="group mt-6">
            <summary className="readout flex cursor-pointer list-none items-center gap-3 text-muted-foreground [&::-webkit-details-marker]:hidden">
              <span className="text-foreground">{STAGE_LABELS[stage]}</span>
              <span className="h-px flex-1 bg-border" aria-hidden />
              <span>{String(items.length).padStart(2, "0")}</span>
              <span className="transition group-open:rotate-90">›</span>
            </summary>
            <ul className="mt-3 divide-y divide-border border-y border-border">
              {items.map((p) => {
                const clients = (p.clients ?? []).map((c) => (typeof c === "object" && c ? c.name.split(" ")[0] : "")).filter(Boolean);
                return (
                  <li key={p.id}>
                    <Link href={`/studio/projects/${p.id}`} className="flex items-baseline justify-between gap-4 py-3 transition hover:text-rec">
                      <span className="min-w-0">
                        <span className="block truncate text-lg">{p.title}</span>
                        <span className="readout text-muted-foreground">{[clients.join(", "), p.location].filter(Boolean).join(" · ") || "—"}</span>
                      </span>
                      <span className="shrink-0 font-mono text-sm text-muted-foreground">{p.shootDate ? p.shootDate.slice(0, 10) : ""}</span>
                    </Link>
                  </li>
                );
              })}
            </ul>
          </details>
        ))
      ) : (
        <p className="text-muted-foreground">No projects yet.</p>
      )}
    </>
  );
}
