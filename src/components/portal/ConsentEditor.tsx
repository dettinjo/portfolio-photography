"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { ConsentGrid, type ConsentPhoto } from "./ConsentGrid";

// After the review: change publication consent at any time.
export function ConsentEditor({ slug, photos, consent: initial }: { slug: string; photos: ConsentPhoto[]; consent: Record<number, boolean> }) {
  const t = useTranslations("Portal.review");
  const [consent, setConsent] = useState(initial);
  const [state, setState] = useState<"idle" | "dirty" | "saving" | "saved" | "error">("idle");
  async function save() {
    setState("saving");
    try {
      const res = await fetch("/api/portal/consent", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ project: slug, consent }),
      });
      setState(res.ok ? "saved" : "error");
    } catch {
      setState("error");
    }
  }
  return (
    <div>
      <ConsentGrid
        photos={photos}
        value={consent}
        onChange={(v) => {
          setConsent(v);
          setState("dirty");
        }}
      />
      <div className="mt-5 flex items-center gap-4">
        <button type="button" onClick={save} disabled={state !== "dirty"} className="bg-foreground px-5 py-2.5 text-background transition hover:bg-rec hover:text-white disabled:opacity-40">
          {t("consentSave")}
        </button>
        {state === "saved" && <span className="readout text-rec">{t("saved")}</span>}
        {state === "error" && (
          <span role="alert" className="text-rec">
            {t("error")}
          </span>
        )}
      </div>
    </div>
  );
}
