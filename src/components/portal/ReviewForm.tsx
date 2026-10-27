"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { Star } from "lucide-react";
import { cn } from "@/lib/utils";
import { ConsentGrid, type ConsentPhoto } from "./ConsentGrid";

const KEYS = ["communication", "creativity", "professionalism", "value"] as const;

export function ReviewForm({ slug, photos, defaultName, consent: initialConsent }: { slug: string; photos: ConsentPhoto[]; defaultName: string; consent: Record<number, boolean> }) {
  const t = useTranslations("Portal.review");
  const [ratings, setRatings] = useState<Record<string, number>>({});
  const [quote, setQuote] = useState("");
  const [name, setName] = useState(defaultName);
  const [role, setRole] = useState("");
  const [favourite, setFavourite] = useState<number | null>(null);
  const [consent, setConsent] = useState(initialConsent);
  const [agree, setAgree] = useState(false);
  const [state, setState] = useState<"idle" | "sending" | "missing" | "error">("idle");
  const complete = KEYS.every((k) => ratings[k]) && quote.trim().length > 0;

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!complete) return setState("missing");
    setState("sending");
    try {
      const res = await fetch("/api/portal/review", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ project: slug, ratings, quote, name, role, favourite, consent, agree }),
      });
      if (!res.ok) throw new Error();
      window.location.reload();
    } catch {
      setState("error");
    }
  }

  return (
    <form onSubmit={submit} className="space-y-14">
      <fieldset className="grid gap-6 sm:grid-cols-2">
        {KEYS.map((k) => (
          <div key={k}>
            <legend className="readout text-muted-foreground">{t(`ratings.${k}`)}</legend>
            <div className="mt-2 flex gap-1" role="radiogroup" aria-label={t(`ratings.${k}`)}>
              {[1, 2, 3, 4, 5].map((n) => (
                <button
                  key={n}
                  type="button"
                  role="radio"
                  aria-checked={ratings[k] === n}
                  aria-label={`${n}/5`}
                  onClick={() => setRatings((r) => ({ ...r, [k]: n }))}
                  className="p-0.5 transition hover:scale-110"
                >
                  <Star className={cn("h-7 w-7", (ratings[k] ?? 0) >= n ? "fill-rec text-rec" : "text-border")} />
                </button>
              ))}
            </div>
          </div>
        ))}
      </fieldset>

      <div>
        <label htmlFor="review-quote" className="display text-3xl lowercase">
          {t("quote")}
        </label>
        <textarea
          id="review-quote"
          value={quote}
          onChange={(e) => setQuote(e.target.value)}
          placeholder={t("quotePlaceholder")}
          rows={4}
          maxLength={1500}
          className="mt-3 w-full resize-y border-b border-foreground bg-transparent py-2 text-lg outline-none focus:border-rec"
        />
        <div className="mt-6 grid gap-6 sm:grid-cols-2">
          <div>
            <label htmlFor="review-name" className="readout text-muted-foreground">
              {t("name")}
            </label>
            <input id="review-name" value={name} maxLength={80} onChange={(e) => setName(e.target.value)} className="mt-1 w-full border-b border-foreground bg-transparent py-2 outline-none focus:border-rec" />
          </div>
          <div>
            <label htmlFor="review-role" className="readout text-muted-foreground">
              {t("role")}
            </label>
            <input id="review-role" value={role} maxLength={80} placeholder={t("rolePlaceholder")} onChange={(e) => setRole(e.target.value)} className="mt-1 w-full border-b border-foreground bg-transparent py-2 outline-none placeholder:text-muted-foreground focus:border-rec" />
          </div>
        </div>
      </div>

      {photos.length > 0 && (
        <div>
          <p className="display text-3xl lowercase">{t("favourite")}</p>
          <p className="mt-1 text-muted-foreground">{t("favouriteHelp")}</p>
          <ul className="mt-4 grid grid-cols-3 gap-2 sm:grid-cols-5 lg:grid-cols-6" role="radiogroup" aria-label={t("favourite")}>
            {photos.map((p) => (
              <li key={p.id}>
                <button
                  type="button"
                  role="radio"
                  aria-checked={favourite === p.id}
                  aria-label={p.filename}
                  onClick={() => setFavourite(favourite === p.id ? null : p.id)}
                  className={cn("relative block aspect-square w-full overflow-hidden transition", favourite === p.id ? "-rotate-2 scale-105 ring-2 ring-rec ring-offset-2 ring-offset-background" : "hover:opacity-90")}
                >
                  {/* eslint-disable-next-line @next/next/no-img-element -- access-checked /api/previews */}
                  <img src={p.src} alt="" loading="lazy" className="h-full w-full object-cover" />
                  {favourite === p.id && <Star className="absolute right-1.5 top-1.5 h-5 w-5 fill-rec text-rec drop-shadow" />}
                </button>
              </li>
            ))}
          </ul>
        </div>
      )}

      {photos.length > 0 && (
        <div>
          <p className="display text-3xl lowercase">{t("consent")}</p>
          <p className="mt-1 max-w-xl text-muted-foreground">{t("consentHelp")}</p>
          <div className="mt-4">
            <ConsentGrid photos={photos} value={consent} onChange={setConsent} />
          </div>
        </div>
      )}

      <div>
        <label className="flex cursor-pointer items-start gap-3 text-lg">
          <input type="checkbox" checked={agree} onChange={(e) => setAgree(e.target.checked)} className="mt-1.5 h-5 w-5 shrink-0 accent-[hsl(var(--rec))]" />
          {t("agree")}
        </label>
        <button type="submit" disabled={!agree || state === "sending"} className="mt-6 bg-foreground px-6 py-3 text-background transition hover:bg-rec hover:text-white disabled:opacity-40">
          {state === "sending" ? t("sending") : `${t("submit")} →`}
        </button>
        {(state === "missing" || state === "error") && (
          <p role="alert" className="mt-3 text-rec">
            {state === "missing" ? t("missing") : t("error")}
          </p>
        )}
      </div>
    </form>
  );
}
