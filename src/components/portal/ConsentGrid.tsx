"use client";

import { useTranslations } from "next-intl";
import { Check, Lock } from "lucide-react";
import { cn } from "@/lib/utils";

export interface ConsentPhoto {
  id: number;
  src: string;
  filename: string;
}

// Photos as tiles: tap to allow publishing (orange check) or keep private (lock).
export function ConsentGrid({ photos, value, onChange }: { photos: ConsentPhoto[]; value: Record<number, boolean>; onChange: (v: Record<number, boolean>) => void }) {
  const t = useTranslations("Portal.review");
  const set = (all: boolean) => onChange(Object.fromEntries(photos.map((p) => [p.id, all])));
  return (
    <div>
      <div className="mb-3 flex gap-2">
        <button type="button" onClick={() => set(true)} className="readout border border-border px-2.5 py-1 hover:border-foreground">
          {t("all")}
        </button>
        <button type="button" onClick={() => set(false)} className="readout border border-border px-2.5 py-1 hover:border-foreground">
          {t("none")}
        </button>
      </div>
      <ul className="grid grid-cols-3 gap-2 sm:grid-cols-5 lg:grid-cols-6">
        {photos.map((p) => {
          const on = Boolean(value[p.id]);
          return (
            <li key={p.id}>
              <button
                type="button"
                role="checkbox"
                aria-checked={on}
                aria-label={`${p.filename}: ${on ? t("may") : t("private")}`}
                onClick={() => onChange({ ...value, [p.id]: !on })}
                className={cn("relative block aspect-square w-full overflow-hidden transition", on ? "ring-2 ring-rec ring-offset-2 ring-offset-background" : "opacity-60 grayscale hover:opacity-90")}
              >
                {/* eslint-disable-next-line @next/next/no-img-element -- access-checked /api/previews */}
                <img src={p.src} alt="" loading="lazy" className="h-full w-full object-cover" />
                <span className={cn("absolute right-1.5 top-1.5 grid h-6 w-6 place-items-center rounded-full", on ? "bg-rec text-white" : "bg-black/60 text-white")}>
                  {on ? <Check className="h-3.5 w-3.5" /> : <Lock className="h-3 w-3" />}
                </span>
              </button>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
