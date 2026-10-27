"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";

// Confirm checkbox + button. With Stripe: on to Checkout for the deposit;
// without: the acceptance is recorded and the page reloads.
export function AcceptProposal({ slug, amount, payOnly, online }: { slug: string; amount: string; payOnly: boolean; online: boolean }) {
  const t = useTranslations("Portal.proposal");
  const [checked, setChecked] = useState(payOnly);
  const [state, setState] = useState<"idle" | "working" | "error">("idle");

  async function go() {
    setState("working");
    try {
      const res = await fetch("/api/portal/proposal", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ project: slug, accept: true }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      if (data.url) window.location.assign(data.url);
      else window.location.reload();
    } catch {
      setState("error");
    }
  }

  const label = !online ? t("acceptOnly") : payOnly ? t("payAgain", { amount }) : t("pay", { amount });
  return (
    <div className="mt-8">
      {!payOnly && (
        <label className="flex cursor-pointer items-center gap-3 text-lg">
          <input type="checkbox" checked={checked} onChange={(e) => setChecked(e.target.checked)} className="h-5 w-5 accent-[hsl(var(--rec))]" />
          {t("confirm")}
        </label>
      )}
      <button
        type="button"
        onClick={go}
        disabled={!checked || state === "working"}
        className="mt-5 bg-foreground px-6 py-3 text-background transition hover:bg-rec hover:text-white disabled:opacity-40"
      >
        {state === "working" ? t("working") : `${label} →`}
      </button>
      {online && <p className="readout mt-3 text-muted-foreground">{t("secure")}</p>}
      {state === "error" && (
        <p role="alert" className="mt-3 text-rec">
          {t("error")}
        </p>
      )}
    </div>
  );
}
