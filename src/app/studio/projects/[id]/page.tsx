import { notFound } from "next/navigation";
import Link from "next/link";
import { StudioHeader } from "@/components/studio/StudioHeader";
import { ProjectButton, ReplyBox, StageSelect } from "@/components/studio/StudioActions";
import { requireAdminPage } from "@/lib/studio";
import { getPayloadClient } from "@/lib/payload";
import { isStage } from "@/lib/stages";

export const metadata = { title: "Project" };

const when = (iso: string) =>
  new Intl.DateTimeFormat("en-GB", { dateStyle: "medium", timeStyle: "short", timeZone: "Europe/Berlin" }).format(new Date(iso));

export default async function StudioProject({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  await requireAdminPage(`/studio/projects/${id}`);
  if (!/^\d{1,9}$/.test(id)) notFound();
  const payload = await getPayloadClient();
  const project = await payload.findByID({ collection: "projects", id: Number(id), depth: 1, overrideAccess: true }).catch(() => null);
  if (!project) notFound();
  const where = { project: { equals: project.id } };
  const [messages, activity, counts] = await Promise.all([
    payload.find({ collection: "messages", where, sort: "-createdAt", limit: 20, depth: 0, overrideAccess: true }),
    payload.find({ collection: "activity", where, sort: "-createdAt", limit: 12, depth: 0, overrideAccess: true }),
    Promise.all([
      payload.count({ collection: "photos", where: { and: [where, { purpose: { equals: "preview" } }, { status: { equals: "ready" } }] }, overrideAccess: true }),
      payload.count({ collection: "photos", where: { and: [where, { purpose: { equals: "final" } }, { status: { equals: "ready" } }] }, overrideAccess: true }),
      payload.count({ collection: "picks", where, overrideAccess: true }),
      payload.count({ collection: "revisions", where: { and: [where, { status: { equals: "requested" } }] }, overrideAccess: true }),
    ]),
  ]);
  const [previews, finals, picks, changes] = counts.map((c) => c.totalDocs);
  const clients = (project.clients ?? []).filter((c) => typeof c === "object" && c) as { id: number; name: string; email: string }[];
  const facts: [string, string | number | null | undefined][] = [
    // A date without a time (00:00 UTC) is shown without one
    ["Shoot", project.shootDate ? (project.shootDate.slice(11, 19) === "00:00:00" ? project.shootDate.slice(0, 10) : when(project.shootDate)) : null],
    ["Where", project.location],
    ["Clients", clients.map((c) => c.name).join(", ")],
    ["Folder", project.ncFolder ?? project.ncFolderError],
    ["Previews", previews],
    ["Picks", picks],
    ["Finals", finals],
    ["Open changes", changes],
    ["Gallery until", project.delivery?.expiresAt?.slice(0, 10)],
  ];
  const thread = [...messages.docs].reverse();

  return (
    <>
      <StudioHeader title={project.title} back={{ href: "/studio/projects", label: "Projects" }} />
      <StageSelect projectId={project.id} stage={isStage(project.stage) ? project.stage : "proposal"} />

      <div className="mt-6 flex flex-wrap gap-2">
        <ProjectButton projectId={project.id} action="sync" label="Fetch photos now" done="Syncing ✓" />
        {clients.length > 0 && <ProjectButton projectId={project.id} action="invite" label="Invite clients" done="Sent ✓" />}
        <Link href={`/studio/upload?target=project:${project.id}:final`} className="readout border border-border px-3 py-2 hover:border-foreground">Upload…</Link>
        <Link href={`/admin/collections/projects/${project.id}`} className="readout border border-border px-3 py-2 hover:border-foreground">Edit ↗</Link>
      </div>

      <dl className="mt-8 grid grid-cols-2 gap-x-6 gap-y-4 border-y border-border py-6">
        {facts.filter(([, v]) => v !== null && v !== undefined && v !== "").map(([k, v]) => (
          <div key={k} className="min-w-0">
            <dt className="readout text-muted-foreground">{k}</dt>
            <dd className="mt-1 truncate font-mono text-sm">{v}</dd>
          </div>
        ))}
      </dl>

      {clients.length > 0 && (
        <section className="mt-10">
          <p className="readout text-muted-foreground">Messages</p>
          <ol className="mt-4 space-y-4">
            {thread.map((m) => (
              <li key={m.id} className={m.client ? "mr-10" : "ml-10"}>
                <p className="readout text-muted-foreground">{m.client ? clients.find((c) => c.id === (typeof m.client === "object" ? m.client?.id : m.client))?.name ?? "Client" : "You"} · {when(m.createdAt)}</p>
                <p className={`mt-1 whitespace-pre-wrap px-4 py-3 ${m.client ? "bg-muted" : "bg-foreground text-background"}`}>{m.body}</p>
              </li>
            ))}
          </ol>
          <ReplyBox projectId={project.id} placeholder="Write to the client…" />
        </section>
      )}

      <section className="mt-10">
        <p className="readout text-muted-foreground">Activity</p>
        <ol className="mt-3 space-y-2">
          {activity.docs.map((a) => (
            <li key={a.id} className="flex gap-3 text-sm">
              <span className="w-28 shrink-0 font-mono text-muted-foreground">{when(a.createdAt).replace(/,.*$/, "")}</span>
              <span>{a.message}</span>
            </li>
          ))}
        </ol>
      </section>
    </>
  );
}
