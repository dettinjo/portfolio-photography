"use client";

// Month calendar for "Plan your shoot": booked days are marked (from
// /api/availability — dates only) but stay selectable, because a second slot
// on a busy day sometimes works. Weeks start on Monday.
import { useEffect, useMemo, useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";

const MAX_MONTHS_AHEAD = 18;
const pad = (n: number) => String(n).padStart(2, "0");
const keyOf = (y: number, m: number, d: number) => `${y}-${pad(m + 1)}-${pad(d)}`;
const monthParam = (y: number, m: number) => `${y}-${pad(m + 1)}`;

function today() {
  const d = new Date();
  return { y: d.getFullYear(), m: d.getMonth(), key: keyOf(d.getFullYear(), d.getMonth(), d.getDate()) };
}

export function AvailabilityCalendar({ value, onChange }: { value: string; onChange: (day: string) => void }) {
  const t = useTranslations("Site.sessions.planner.calendar");
  const locale = useLocale();
  const now = useMemo(today, []);
  const [view, setView] = useState(() => (value ? { y: Number(value.slice(0, 4)), m: Number(value.slice(5, 7)) - 1 } : { y: now.y, m: now.m }));
  const [busy, setBusy] = useState<Set<string>>(new Set());
  const [loaded, setLoaded] = useState<Set<string>>(new Set());

  // Load three months at a time, once each
  useEffect(() => {
    const param = monthParam(view.y, view.m);
    if (loaded.has(param)) return;
    let cancelled = false;
    fetch(`/api/availability?from=${param}&months=3`)
      .then((r) => (r.ok ? r.json() : { busy: [] }))
      .then((data: { busy?: string[] }) => {
        if (cancelled) return;
        setBusy((b) => new Set([...b, ...(data.busy ?? [])]));
        setLoaded((l) => {
          const next = new Set(l);
          for (let i = 0; i < 3; i++) {
            const d = new Date(view.y, view.m + i, 1);
            next.add(monthParam(d.getFullYear(), d.getMonth()));
          }
          return next;
        });
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, [view, loaded]);

  const monthsAhead = (view.y - now.y) * 12 + (view.m - now.m);
  const move = (d: number) => setView((v) => {
    const n = new Date(v.y, v.m + d, 1);
    return { y: n.getFullYear(), m: n.getMonth() };
  });

  const title = new Intl.DateTimeFormat(locale, { month: "long", year: "numeric" }).format(new Date(view.y, view.m, 1));
  const weekdays = Array.from({ length: 7 }, (_, i) => new Intl.DateTimeFormat(locale, { weekday: "narrow" }).format(new Date(2024, 0, 1 + i))); // 1 Jan 2024 was a Monday
  const long = (key: string) => new Intl.DateTimeFormat(locale, { weekday: "long", day: "numeric", month: "long", year: "numeric" }).format(new Date(`${key}T12:00:00`));
  const days = new Date(view.y, view.m + 1, 0).getDate();
  const lead = (new Date(view.y, view.m, 1).getDay() + 6) % 7;
  const ready = loaded.has(monthParam(view.y, view.m));

  return (
    <div>
      <div className="flex items-center justify-between">
        <button type="button" onClick={() => move(-1)} disabled={monthsAhead <= 0} aria-label={t("previous")} className="p-2 hover:text-rec disabled:opacity-20">
          <ChevronLeft className="h-5 w-5" />
        </button>
        <p className="readout" aria-live="polite">{title}</p>
        <button type="button" onClick={() => move(1)} disabled={monthsAhead >= MAX_MONTHS_AHEAD} aria-label={t("next")} className="p-2 hover:text-rec disabled:opacity-20">
          <ChevronRight className="h-5 w-5" />
        </button>
      </div>
      <div className="mt-2 grid grid-cols-7 gap-1 text-center" aria-hidden>
        {weekdays.map((w, i) => (
          <span key={i} className="readout text-muted-foreground">{w}</span>
        ))}
      </div>
      <div className={cn("mt-1 grid grid-cols-7 gap-1 transition-opacity", !ready && "opacity-60")}>
        {Array.from({ length: lead }, (_, i) => <span key={`l${i}`} />)}
        {Array.from({ length: days }, (_, i) => {
          const key = keyOf(view.y, view.m, i + 1);
          const past = key < now.key;
          const isBusy = busy.has(key);
          const selected = key === value;
          return (
            <button
              key={key}
              type="button"
              disabled={past}
              onClick={() => onChange(selected ? "" : key)}
              aria-pressed={selected}
              aria-label={`${long(key)}${isBusy ? ` — ${t("busy")}` : ""}`}
              className={cn(
                "relative aspect-square font-mono text-sm transition disabled:text-muted-foreground/40",
                !past && !selected && "hover:bg-muted",
                isBusy && !selected && "text-muted-foreground line-through decoration-rec decoration-2",
                selected && "bg-foreground text-background",
                key === now.key && !selected && "outline outline-1 outline-border",
              )}
            >
              {i + 1}
              {isBusy && <span className="absolute bottom-1 left-1/2 h-1 w-1 -translate-x-1/2 rounded-full bg-rec" aria-hidden />}
            </button>
          );
        })}
      </div>
      <p className="readout mt-3 flex flex-wrap gap-x-4 gap-y-1 text-muted-foreground">
        <span>
          <span className="mr-1.5 inline-block h-1.5 w-1.5 rounded-full bg-rec align-middle" aria-hidden />
          {t("busy")}
        </span>
        <span>{t("free")}</span>
      </p>
      {value && (
        <p className="mt-4 text-lg" role="status">
          {long(value)}
          {busy.has(value) && <span className="mt-1 block text-base text-muted-foreground">{t("busyNote")}</span>}
        </p>
      )}
    </div>
  );
}
