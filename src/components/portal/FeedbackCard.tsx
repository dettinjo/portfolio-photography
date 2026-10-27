"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { Annoyed, Frown, Laugh, Meh, Smile } from "lucide-react";
import { cn } from "@/lib/utils";

const FACES = [Frown, Annoyed, Meh, Smile, Laugh];

// A quick private reaction: five faces and an optional comment.
export function FeedbackCard({ slug, moment }: { slug: string; moment: "booking" | "sneak-peek" }) {
  const t = useTranslations("Portal.feedback");
  const labels = t.raw("faces") as string[];
  const [rating, setRating] = useState<number | null>(null);
  const [comment, setComment] = useState("");
  const [state, setState] = useState<"idle" | "sending" | "done" | "error">("idle");

  async function send() {
    setState("sending");
    try {
      const res = await fetch("/api/portal/feedback", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ project: slug, moment, rating, comment }),
      });
      setState(res.ok || res.status === 409 ? "done" : "error");
    } catch {
      setState("error");
    }
  }

  if (state === "done") {
    return <p className="mt-10 border-l-2 border-rec pl-4 text-lg" role="status">{t("thanks")}</p>;
  }
  return (
    <section className="mt-10 border border-border p-5">
      <p className="display text-3xl lowercase">{t(moment)}</p>
      <p className="readout mt-1 text-muted-foreground">{t("private")}</p>
      <div className="mt-5 flex flex-wrap gap-2" role="radiogroup" aria-label={t(moment)}>
        {FACES.map((Face, i) => (
          <button
            key={i}
            type="button"
            role="radio"
            aria-checked={rating === i + 1}
            aria-label={labels[i]}
            title={labels[i]}
            onClick={() => setRating(i + 1)}
            className={cn(
              "grid h-12 w-12 place-items-center rounded-full border transition hover:-translate-y-0.5",
              rating === i + 1 ? "border-rec bg-rec text-white" : "border-border hover:border-foreground",
            )}
          >
            <Face className="h-6 w-6" />
          </button>
        ))}
      </div>
      {rating && (
        <div className="mt-5">
          <textarea
            value={comment}
            onChange={(e) => setComment(e.target.value)}
            placeholder={t("comment")}
            aria-label={t("comment")}
            rows={2}
            maxLength={2000}
            className="w-full resize-none border-b border-foreground bg-transparent py-2 outline-none focus:border-rec"
          />
          <button type="button" onClick={send} disabled={state === "sending"} className="mt-4 bg-foreground px-5 py-2.5 text-background transition hover:bg-rec hover:text-white disabled:opacity-50">
            {t("send")} →
          </button>
          {state === "error" && (
            <p role="alert" className="mt-2 text-rec">
              {t("error")}
            </p>
          )}
        </div>
      )}
    </section>
  );
}
