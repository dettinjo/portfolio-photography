"use client";

// "Notify me on this device": subscribes this browser to Web Push via the
// service worker. Hidden where push isn't possible; on iPhone it explains that
// the site must be added to the Home Screen first (iOS ≥ 16.4).
import { useEffect, useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import { Bell, BellOff } from "lucide-react";
import { cn } from "@/lib/utils";

type State = "loading" | "unsupported" | "ios" | "denied" | "off" | "on" | "working" | "error";

const toKey = (base64: string) => {
  const pad = "=".repeat((4 - (base64.length % 4)) % 4);
  const raw = atob((base64 + pad).replace(/-/g, "+").replace(/_/g, "/"));
  return Uint8Array.from(raw, (c) => c.charCodeAt(0));
};

export function PushToggle({ className, labels }: { className?: string; labels?: Partial<Record<"on" | "off" | "help", string>> }) {
  const t = useTranslations("Portal.push");
  const locale = useLocale();
  const [state, setState] = useState<State>("loading");
  const [key, setKey] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      const ios = /iPad|iPhone|iPod/.test(navigator.userAgent);
      const standalone = window.matchMedia("(display-mode: standalone)").matches || (navigator as { standalone?: boolean }).standalone;
      if (!("serviceWorker" in navigator) || !("PushManager" in window) || !("Notification" in window)) {
        return setState(ios && !standalone ? "ios" : "unsupported");
      }
      const res = await fetch("/api/push/subscribe").then((r) => r.json()).catch(() => null);
      if (!res?.enabled) return setState("unsupported");
      setKey(res.key);
      if (Notification.permission === "denied") return setState("denied");
      const reg = await navigator.serviceWorker.ready;
      setState((await reg.pushManager.getSubscription()) ? "on" : "off");
    })().catch(() => setState("unsupported"));
  }, []);

  async function enable() {
    if (!key) return;
    setState("working");
    try {
      if ((await Notification.requestPermission()) !== "granted") return setState("denied");
      const reg = await navigator.serviceWorker.ready;
      const sub = (await reg.pushManager.getSubscription()) ?? (await reg.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: toKey(key) }));
      const res = await fetch("/api/push/subscribe", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ subscription: sub.toJSON(), locale }),
      });
      setState(res.ok ? "on" : "error");
    } catch {
      setState("error");
    }
  }

  async function disable() {
    setState("working");
    try {
      const reg = await navigator.serviceWorker.ready;
      const sub = await reg.pushManager.getSubscription();
      if (sub) {
        await fetch("/api/push/subscribe", { method: "DELETE", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ endpoint: sub.endpoint }) });
        await sub.unsubscribe();
      }
      setState("off");
    } catch {
      setState("error");
    }
  }

  if (state === "loading" || state === "unsupported") return null;
  if (state === "ios" || state === "denied") return <p className={cn("readout text-muted-foreground", className)}>{t(state)}</p>;
  return (
    <div className={cn("flex flex-wrap items-center gap-x-4 gap-y-1", className)}>
      {state === "on" ? (
        <>
          <span className="readout flex items-center gap-2 text-rec">
            <Bell className="h-3.5 w-3.5" /> {labels?.on ?? t("on")}
          </span>
          <button type="button" onClick={disable} className="readout text-muted-foreground hover:text-foreground">
            <BellOff className="mr-1 inline h-3.5 w-3.5" />
            {t("turnOff")}
          </button>
        </>
      ) : (
        <button
          type="button"
          onClick={enable}
          disabled={state === "working"}
          className="readout flex items-center gap-2 border border-border px-3 py-1.5 transition hover:border-foreground disabled:opacity-50"
        >
          <Bell className="h-3.5 w-3.5" /> {labels?.off ?? t("off")}
        </button>
      )}
      {state !== "on" && <span className="text-sm text-muted-foreground">{labels?.help ?? t("help")}</span>}
      {state === "error" && (
        <span role="alert" className="text-sm text-rec">
          {t("error")}
        </span>
      )}
    </div>
  );
}
