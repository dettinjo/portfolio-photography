"use client";

import { useRef, useState } from "react";
import { Check, ImageUp, Loader2, X } from "lucide-react";
import type { UploadTarget } from "@/lib/studio";

type Item = { name: string; size: number; state: "waiting" | "uploading" | "done" | "error"; error?: string };

const mb = (n: number) => `${(n / 1_000_000).toFixed(1)} MB`;
const TYPES = ["image/jpeg", "image/png", "image/webp", "image/tiff"];

// Pick a destination, then photos; they go to Nextcloud one by one.
// With `shared`, photos shared from the gallery wait on the server already.
export function UploadForm({ targets, initialTarget, shared }: { targets: UploadTarget[]; initialTarget?: string; shared?: { token: string; files: { name: string; size: number }[] } }) {
  const [target, setTarget] = useState(initialTarget && targets.some((t) => t.value === initialTarget) ? initialTarget : targets[0]?.value ?? "new");
  const [newName, setNewName] = useState("");
  const [items, setItems] = useState<Item[]>(shared ? shared.files.map((f) => ({ ...f, state: "waiting" })) : []);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const input = useRef<HTMLInputElement>(null);
  const files = useRef<File[]>([]);
  const value = target === "new" ? `newseries:${newName.trim()}` : target;
  const ready = target !== "new" || newName.trim().length > 0;

  function choose(list: FileList | null) {
    const picked = [...(list ?? [])].filter((f) => TYPES.includes(f.type));
    files.current = picked;
    setItems(picked.map((f) => ({ name: f.name, size: f.size, state: "waiting" })));
    setMessage(null);
  }

  async function send() {
    setBusy(true);
    setMessage(null);
    if (shared) {
      setItems((list) => list.map((i) => ({ ...i, state: "uploading" })));
      const res = await fetch("/api/studio/upload-shared", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ token: shared.token, target: value }) });
      const data = await res.json().catch(() => ({}));
      setItems((list) => list.map((i, n) => ({ ...i, state: res.ok || n < (data.done ?? 0) ? "done" : "error", error: res.ok ? undefined : data.error })));
      setMessage(res.ok ? `${data.done} photos → ${data.folder}. Syncing…` : data.error ?? "Upload failed");
      setBusy(false);
      return;
    }
    let ok = 0;
    for (const [i, file] of files.current.entries()) {
      if (items[i]?.state === "done") continue;
      setItems((list) => list.map((x, n) => (n === i ? { ...x, state: "uploading" } : x)));
      const form = new FormData();
      form.set("target", value);
      form.set("file", file);
      try {
        const res = await fetch("/api/studio/upload", { method: "POST", body: form });
        const data = await res.json().catch(() => ({}));
        if (!res.ok) throw new Error(data.error ?? `Error ${res.status}`);
        ok++;
        setItems((list) => list.map((x, n) => (n === i ? { ...x, state: "done" } : x)));
      } catch (err) {
        setItems((list) => list.map((x, n) => (n === i ? { ...x, state: "error", error: (err as Error).message } : x)));
      }
    }
    setMessage(ok ? `${ok} uploaded — the site picks them up in a minute.` : null);
    setBusy(false);
  }

  const groups = ["Projects", "Portfolio"] as const;
  return (
    <div className="space-y-8">
      <div>
        <label htmlFor="target" className="readout text-muted-foreground">Where to</label>
        <select id="target" value={target} onChange={(e) => setTarget(e.target.value)} className="mt-1 block w-full border-b border-foreground bg-transparent py-2 text-lg outline-none focus:border-rec">
          {groups.map((g) => (
            <optgroup key={g} label={g}>
              {targets.filter((t) => t.group === g).map((t) => (
                <option key={t.value} value={t.value}>{t.label}</option>
              ))}
              {g === "Portfolio" && <option value="new">+ New portfolio series…</option>}
            </optgroup>
          ))}
        </select>
        {target === "new" && (
          <input value={newName} onChange={(e) => setNewName(e.target.value)} maxLength={80} placeholder='Series name (start with "_" for a draft)' aria-label="New series name" className="mt-3 w-full border-b border-foreground bg-transparent py-2 outline-none focus:border-rec" />
        )}
      </div>

      {!shared && (
        <button type="button" onClick={() => input.current?.click()} className="flex w-full flex-col items-center gap-2 border border-dashed border-foreground/40 py-10 text-muted-foreground transition hover:border-rec hover:text-rec">
          <ImageUp className="h-7 w-7" />
          <span className="readout">Choose photos</span>
        </button>
      )}
      <input ref={input} type="file" accept={TYPES.join(",")} multiple hidden onChange={(e) => choose(e.target.files)} />

      {items.length > 0 && (
        <ul className="divide-y divide-border border-y border-border">
          {items.map((i, n) => (
            <li key={n} className="flex items-center gap-3 py-2 text-sm">
              <span className="grid h-5 w-5 place-items-center">
                {i.state === "done" ? <Check className="h-4 w-4 text-rec" /> : i.state === "uploading" ? <Loader2 className="h-4 w-4 animate-spin" /> : i.state === "error" ? <X className="h-4 w-4 text-rec" /> : <span className="h-1.5 w-1.5 rounded-full bg-muted-foreground" />}
              </span>
              <span className="min-w-0 flex-1 truncate">{i.name}</span>
              <span className="font-mono text-muted-foreground">{mb(i.size)}</span>
            </li>
          ))}
        </ul>
      )}
      {items.find((i) => i.error) && <p role="alert" className="text-rec">{items.find((i) => i.error)?.error}</p>}

      <button type="button" onClick={send} disabled={busy || !items.length || !ready || items.every((i) => i.state === "done")} className="w-full bg-foreground py-3 text-background transition hover:bg-rec hover:text-white disabled:opacity-40">
        {busy ? "Uploading…" : `Upload ${items.filter((i) => i.state !== "done").length || ""} photos →`}
      </button>
      {message && <p className="readout text-rec" role="status">{message}</p>}
    </div>
  );
}
