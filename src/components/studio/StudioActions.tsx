"use client";

// Small client islands for /studio: reply, project actions, review approval,
// inquiry → project. Each posts to /api/studio/* and refreshes the page.
import { useState } from "react";
import { useRouter } from "next/navigation";
import { STAGES, STAGE_LABELS, type Stage } from "@/lib/stages";
import { cn } from "@/lib/utils";

async function post(url: string, body: unknown) {
  const res = await fetch(url, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error ?? `Error ${res.status}`);
  return data;
}

function useAction() {
  const router = useRouter();
  const [state, setState] = useState<"idle" | "busy" | "done" | string>("idle");
  const run = async (fn: () => Promise<unknown>, refresh = true) => {
    setState("busy");
    try {
      await fn();
      setState("done");
      if (refresh) router.refresh();
    } catch (err) {
      setState((err as Error).message);
    }
  };
  const error = state !== "idle" && state !== "busy" && state !== "done" ? state : null;
  return { state, run, error };
}

const btn = "readout border border-border px-3 py-2 transition hover:border-foreground disabled:opacity-40";

export function ReplyBox({ projectId, placeholder = "Reply…" }: { projectId: number; placeholder?: string }) {
  const [text, setText] = useState("");
  const { state, run, error } = useAction();
  return (
    <div className="mt-3">
      <textarea value={text} onChange={(e) => setText(e.target.value)} rows={2} maxLength={4000} placeholder={placeholder} aria-label={placeholder} className="w-full resize-y border-b border-foreground bg-transparent py-2 outline-none focus:border-rec" />
      <div className="mt-2 flex items-center gap-3">
        <button type="button" disabled={!text.trim() || state === "busy"} onClick={() => run(async () => { await post("/api/studio/reply", { project: projectId, body: text.trim() }); setText(""); })} className="bg-foreground px-4 py-2 text-sm text-background transition hover:bg-rec hover:text-white disabled:opacity-40">
          {state === "busy" ? "Sending…" : "Send →"}
        </button>
        {state === "done" && <span className="readout text-rec">Sent ✓</span>}
        {error && <span role="alert" className="text-sm text-rec">{error}</span>}
      </div>
    </div>
  );
}

export function StageSelect({ projectId, stage }: { projectId: number; stage: Stage }) {
  const { state, run, error } = useAction();
  return (
    <div>
      <label className="readout text-muted-foreground" htmlFor="stage">Stage</label>
      <select
        id="stage"
        defaultValue={stage}
        disabled={state === "busy"}
        onChange={(e) => run(() => post("/api/studio/project", { id: projectId, action: "stage", stage: e.target.value }))}
        className="mt-1 block w-full border-b border-foreground bg-transparent py-2 text-lg outline-none focus:border-rec"
      >
        {STAGES.map((s) => (
          <option key={s} value={s}>{STAGE_LABELS[s]}</option>
        ))}
      </select>
      {error && <p role="alert" className="mt-1 text-sm text-rec">{error}</p>}
    </div>
  );
}

export function ProjectButton({ projectId, action, label, done }: { projectId: number; action: "invite" | "sync"; label: string; done: string }) {
  const { state, run, error } = useAction();
  return (
    <span className="inline-flex items-center gap-2">
      <button type="button" disabled={state === "busy"} onClick={() => run(() => post("/api/studio/project", { id: projectId, action }))} className={btn}>
        {state === "busy" ? "…" : label}
      </button>
      {state === "done" && <span className="readout text-rec">{done}</span>}
      {error && <span role="alert" className="text-sm text-rec">{error}</span>}
    </span>
  );
}

export function ApproveReview({ id }: { id: number }) {
  const { state, run, error } = useAction();
  return (
    <span className="inline-flex items-center gap-2">
      <button type="button" disabled={state === "busy"} onClick={() => run(() => post("/api/studio/review", { id, approve: true }))} className={cn(btn, "border-rec text-rec")}>
        ✓ Publish
      </button>
      {error && <span role="alert" className="text-sm text-rec">{error}</span>}
    </span>
  );
}

export function InquiryToProject({ id }: { id: number }) {
  const router = useRouter();
  const { state, run, error } = useAction();
  return (
    <span className="inline-flex items-center gap-2">
      <button
        type="button"
        disabled={state === "busy"}
        onClick={() => run(async () => { const res = await post("/api/studio/inquiry", { id }); router.push(`/studio/projects/${res.project}`); }, false)}
        className={btn}
      >
        {state === "busy" ? "…" : "→ Create project"}
      </button>
      {error && <span role="alert" className="text-sm text-rec">{error}</span>}
    </span>
  );
}
