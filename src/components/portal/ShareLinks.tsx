"use client";

// The client's guest links: create one (name, web-size downloads yes/no),
// copy or share it, switch it off.
import { useState } from "react";
import { useRouter } from "next/navigation";
import { useLocale, useTranslations } from "next-intl";
import { Check, Copy, Link2 } from "lucide-react";

export interface ShareLinkItem {
  id: number;
  label: string;
  token: string;
  downloads: boolean;
  views: number;
}

async function call(body: unknown) {
  const res = await fetch("/api/portal/share", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error ?? String(res.status));
  return data;
}

export function ShareLinks({ slug, links }: { slug: string; links: ShareLinkItem[] }) {
  const t = useTranslations("Portal.share");
  const locale = useLocale();
  const router = useRouter();
  const [label, setLabel] = useState("");
  const [downloads, setDownloads] = useState(false);
  const [state, setState] = useState<"idle" | "busy" | "error">("idle");
  const [copied, setCopied] = useState<number | null>(null);
  const url = (token: string) => `${window.location.origin}${locale === "de" ? "/de" : ""}/s/${token}`;

  async function create(e: React.FormEvent) {
    e.preventDefault();
    setState("busy");
    try {
      await call({ project: slug, action: "create", label, downloads });
      setLabel("");
      setDownloads(false);
      setState("idle");
      router.refresh();
    } catch {
      setState("error");
    }
  }

  async function copy(link: ShareLinkItem) {
    const href = url(link.token);
    // Phones: the share sheet; elsewhere: the clipboard
    if (navigator.share && window.matchMedia("(pointer: coarse)").matches) {
      await navigator.share({ title: link.label, url: href }).catch(() => {});
      return;
    }
    await navigator.clipboard.writeText(href).catch(() => {});
    setCopied(link.id);
    setTimeout(() => setCopied(null), 2000);
  }

  async function revoke(link: ShareLinkItem) {
    if (!window.confirm(t("confirmOff", { label: link.label }))) return;
    try {
      await call({ project: slug, action: "revoke", id: link.id });
      router.refresh();
    } catch {
      setState("error");
    }
  }

  return (
    <section className="mt-20" aria-labelledby="share-title">
      <p className="readout text-muted-foreground">
        <Link2 className="mr-2 inline h-3.5 w-3.5 align-[-2px]" />
        {t("label")}
      </p>
      <h2 id="share-title" className="display mt-2 text-4xl lowercase sm:text-5xl">
        {t("title")}
      </h2>
      <p className="mt-3 max-w-xl text-muted-foreground">{t("intro")}</p>

      {links.length > 0 && (
        <ul className="mt-6 divide-y divide-border border-y border-border">
          {links.map((l) => (
            <li key={l.id} className="flex flex-wrap items-center gap-x-4 gap-y-2 py-3">
              <span className="min-w-[12rem] flex-1">
                <span className="block truncate text-lg">{l.label}</span>
                <span className="readout text-muted-foreground">
                  {l.downloads ? t("withDownloads") : t("viewOnly")} · {t("views", { count: l.views })}
                </span>
              </span>
              <span className="flex gap-2">
                <button type="button" onClick={() => copy(l)} className="readout flex items-center gap-1.5 bg-foreground px-3 py-2 text-background transition hover:bg-rec hover:text-white">
                  {copied === l.id ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
                  {copied === l.id ? t("copied") : t("copy")}
                </button>
                <button type="button" onClick={() => revoke(l)} className="readout border border-border px-3 py-2 transition hover:border-foreground">
                  {t("off")}
                </button>
              </span>
            </li>
          ))}
        </ul>
      )}

      <form onSubmit={create} className="mt-6 flex flex-wrap items-end gap-4">
        <label className="flex min-w-[14rem] flex-1 flex-col gap-1">
          <span className="readout text-muted-foreground">{t("name")}</span>
          <input
            value={label}
            onChange={(e) => setLabel(e.target.value)}
            maxLength={60}
            required
            placeholder={t("placeholder")}
            className="border-b border-border bg-transparent py-2 text-lg outline-none focus:border-foreground"
          />
        </label>
        <label className="flex cursor-pointer items-center gap-2 py-2">
          <input type="checkbox" checked={downloads} onChange={(e) => setDownloads(e.target.checked)} className="h-4 w-4 accent-[hsl(var(--rec))]" />
          {t("allowDownloads")}
        </label>
        <button type="submit" disabled={state === "busy" || !label.trim()} className="bg-foreground px-5 py-3 text-background transition hover:bg-rec hover:text-white disabled:opacity-40">
          {state === "busy" ? "…" : `${t("create")} →`}
        </button>
      </form>
      {state === "error" && (
        <p role="alert" className="mt-3 text-rec">
          {t("error")}
        </p>
      )}
    </section>
  );
}
