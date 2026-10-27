"use client";

import { useEffect, useRef, useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import { cn } from "@/lib/utils";
import type { ThreadItem } from "@/lib/portal";

// The conversation: your messages right, mine left, photo notes inline with a thumbnail.
export function MessageThread({ slug, items: initial }: { slug: string; items: ThreadItem[] }) {
  const t = useTranslations("Portal.messages");
  const locale = useLocale();
  const [items, setItems] = useState(initial);
  const [draft, setDraft] = useState("");
  const [state, setState] = useState<"idle" | "sending" | "error">("idle");
  const end = useRef<HTMLDivElement>(null);

  useEffect(() => end.current?.scrollIntoView({ block: "end" }), [items.length]);

  const when = (iso: string) =>
    new Intl.DateTimeFormat(locale === "de" ? "de-DE" : "en-GB", { dateStyle: "medium", timeStyle: "short", timeZone: "Europe/Berlin" }).format(new Date(iso));

  async function send() {
    const body = draft.trim();
    if (!body) return;
    setState("sending");
    try {
      const res = await fetch("/api/portal/messages", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ project: slug, body }),
      });
      if (!res.ok) throw new Error();
      const { message } = await res.json();
      setItems((list) => [...list, { ...message, key: `m${message.id}`, kind: "message" }]);
      setDraft("");
      setState("idle");
    } catch {
      setState("error");
    }
  }

  return (
    <div>
      {items.length ? (
        <ol className="space-y-5">
          {items.map((m) => (
            <li key={m.key} className={cn("flex", m.mine ? "justify-end" : "justify-start")}>
              <div className={cn("max-w-[85%] sm:max-w-[70%]")}>
                <p className={cn("readout mb-1 text-muted-foreground", m.mine && "text-right")}>
                  {m.mine ? t("you") : m.author} · {when(m.createdAt)}
                </p>
                <div
                  className={cn(
                    "whitespace-pre-wrap px-4 py-3",
                    m.fromPhotographer ? "bg-foreground text-background" : m.mine ? "bg-rec/10" : "bg-muted",
                    m.kind === "comment" && "border-l-2 border-rec",
                  )}
                >
                  {m.kind === "comment" && m.photo && (
                    <a href={`/${locale === "de" ? "de/" : ""}c/${slug}/proofing`} className="mb-2 flex items-center gap-3">
                      {/* eslint-disable-next-line @next/next/no-img-element -- access-checked /api/previews */}
                      <img src={m.photo.thumb} alt="" className="h-12 w-12 object-cover" />
                      <span className="readout opacity-70">{t("photoNote", { file: m.photo.filename })} ↗</span>
                    </a>
                  )}
                  {m.body}
                </div>
              </div>
            </li>
          ))}
        </ol>
      ) : (
        <p className="text-muted-foreground">{t("empty")}</p>
      )}
      <div ref={end} />

      <div className="sticky bottom-0 mt-10 border-t border-border bg-background/95 py-4 backdrop-blur standalone:bottom-16">
        <textarea
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) void send();
          }}
          placeholder={t("placeholder")}
          aria-label={t("placeholder")}
          rows={3}
          maxLength={4000}
          className="w-full resize-none border-b border-foreground bg-transparent py-2 text-lg outline-none focus:border-rec"
        />
        <div className="mt-3 flex items-center gap-4">
          <button
            type="button"
            onClick={send}
            disabled={!draft.trim() || state === "sending"}
            className="bg-foreground px-5 py-2.5 text-background transition hover:bg-rec hover:text-white disabled:opacity-40"
          >
            {state === "sending" ? t("sending") : `${t("send")} →`}
          </button>
          {state === "error" && (
            <span role="alert" className="text-rec">
              {t("error")}
            </span>
          )}
        </div>
      </div>
    </div>
  );
}
