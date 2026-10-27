"use client";

import { useState } from "react";
import { useLocale, useTranslations } from "next-intl";

export function LoginForm() {
  const t = useTranslations("Portal.login");
  const locale = useLocale();
  const [email, setEmail] = useState("");
  const [state, setState] = useState<"idle" | "sending" | "sent" | "error">("idle");

  async function submit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setState("sending");
    const website = new FormData(e.currentTarget).get("website");
    try {
      const res = await fetch("/api/client-auth/request", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, locale, website }),
      });
      setState(res.ok ? "sent" : "error");
    } catch {
      setState("error");
    }
  }

  if (state === "sent") {
    return (
      <div aria-live="polite">
        <p className="display text-4xl lowercase">
          <span className="rec-dot mr-3 align-middle" aria-hidden />
          {t("sentTitle")}
        </p>
        <p className="mt-4 max-w-md text-lg text-muted-foreground">{t("sentText", { email })}</p>
        <button type="button" onClick={() => setState("idle")} className="link-slide mt-8 pb-0.5">
          {t("again")}
        </button>
      </div>
    );
  }

  return (
    <form onSubmit={submit} className="max-w-md">
      <label htmlFor="portal-email" className="readout text-muted-foreground">
        {t("email")}
      </label>
      <input
        id="portal-email"
        type="email"
        required
        autoComplete="email"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        className="mt-2 w-full border-b border-foreground bg-transparent py-3 text-xl outline-none focus:border-rec"
      />
      {/* Honeypot */}
      <input type="text" name="website" tabIndex={-1} autoComplete="off" className="hidden" aria-hidden />
      {state === "error" && (
        <p role="alert" className="mt-4 text-rec">
          {t("error")}
        </p>
      )}
      <button
        type="submit"
        disabled={state === "sending"}
        className="mt-8 bg-foreground px-6 py-3 text-background transition hover:bg-rec hover:text-white disabled:opacity-60"
      >
        {state === "sending" ? t("sending") : `${t("submit")} →`}
      </button>
    </form>
  );
}
