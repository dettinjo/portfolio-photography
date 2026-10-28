"use client";

// TEMPORARY: create / remove the demo data and open the portal as a demo client.
import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";

interface State {
  clients: { id: number; name: string; locale: string }[];
  projects: { id: number; title: string; slug: string; stage: string }[];
}

export function DemoPanel({ state }: { state: State }) {
  const router = useRouter();
  const [busy, setBusy] = useState<null | "seed" | "remove">(null);
  const [message, setMessage] = useState<string | null>(null);
  const has = state.projects.length > 0 || state.clients.length > 0;

  async function run(action: "seed" | "remove") {
    if (action === "remove" && !window.confirm("Remove all demo clients, projects, photos and inquiries?")) return;
    setBusy(action);
    setMessage(null);
    try {
      const res = await fetch("/api/studio/demo", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action }) });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? `Error ${res.status}`);
      setMessage(action === "seed" ? `Created ${data.projects} projects with ${data.photos} photos.` : `Removed ${data.projects} projects, ${data.photos} photos, ${data.clients} clients.`);
      router.refresh();
    } catch (err) {
      setMessage((err as Error).message);
    } finally {
      setBusy(null);
    }
  }

  return (
    <section className="mt-14 border border-dashed border-rec p-4">
      <p className="readout text-rec">Demo data · temporary</p>
      {has ? (
        <>
          <p className="mt-2 text-sm text-muted-foreground">Open the client side as a demo client (this browser gets their sign-in):</p>
          <div className="mt-3 flex flex-wrap gap-2">
            {state.clients.map((c) => (
              <form key={c.id} method="post" action="/api/studio/demo">
                <input type="hidden" name="action" value="open" />
                <input type="hidden" name="client" value={c.id} />
                <button type="submit" className="readout border border-border px-3 py-2 hover:border-foreground">
                  {c.name} ({c.locale.toUpperCase()}) ↗
                </button>
              </form>
            ))}
          </div>
          <ul className="mt-4 space-y-1 text-sm">
            {state.projects.map((p) => (
              <li key={p.id}>
                <Link href={`/studio/projects/${p.id}`} className="hover:text-rec">
                  {p.title}
                </Link>{" "}
                <span className="readout text-muted-foreground">· {p.stage}</span>
              </li>
            ))}
          </ul>
          <button type="button" disabled={busy !== null} onClick={() => run("remove")} className="readout mt-4 border border-rec px-3 py-2 text-rec hover:bg-rec hover:text-white disabled:opacity-40">
            {busy === "remove" ? "Removing…" : "Remove all demo data"}
          </button>
        </>
      ) : (
        <>
          <p className="mt-2 text-sm text-muted-foreground">
            Creates 4 clients, 5 projects in different stages (with previews and finals made from your portfolio photos), picks, notes, messages,
            payments, a revision, guest links, a review and 2 inquiries. No emails are sent while creating it. Takes about a minute.
          </p>
          <button type="button" disabled={busy !== null} onClick={() => run("seed")} className="readout mt-3 bg-foreground px-3 py-2 text-background hover:bg-rec disabled:opacity-40">
            {busy === "seed" ? "Creating… (about a minute)" : "Create demo data"}
          </button>
        </>
      )}
      {message && <p className="mt-3 text-sm" role="status">{message}</p>}
    </section>
  );
}
