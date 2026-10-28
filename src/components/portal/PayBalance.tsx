"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";

// On to Stripe Checkout for the balance; the amount is computed on the server.
export function PayBalance({ slug, label }: { slug: string; label: string }) {
  const t = useTranslations("Portal");
  const [state, setState] = useState<"idle" | "working" | "error">("idle");

  async function go() {
    setState("working");
    try {
      const res = await fetch("/api/portal/pay", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ project: slug }),
      });
      const data = await res.json();
      if (!res.ok || !data.url) throw new Error(data.error);
      window.location.assign(data.url);
    } catch {
      setState("error");
    }
  }

  return (
    <div className="mt-5">
      <button
        type="button"
        onClick={go}
        disabled={state === "working"}
        className="bg-foreground px-6 py-3 text-background transition hover:bg-rec hover:text-white disabled:opacity-40"
      >
        {state === "working" ? t("balance.working") : `${label} →`}
      </button>
      <p className="readout mt-3 text-muted-foreground">{t("proposal.secure")}</p>
      {state === "error" && (
        <p role="alert" className="mt-3 text-rec">
          {t("balance.error")}
        </p>
      )}
    </div>
  );
}
