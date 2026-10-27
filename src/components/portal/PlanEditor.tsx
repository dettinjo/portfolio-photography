"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { Check, X } from "lucide-react";
import { cn } from "@/lib/utils";

interface Props {
  slug: string;
  questions: { question: string; help: string | null }[];
  answers: string[];
  shotList: { item: string; done: boolean }[];
  locked: boolean;
}

// Questionnaire + shot list, saved together.
export function PlanEditor({ slug, questions, answers: initialAnswers, shotList: initialShots, locked }: Props) {
  const t = useTranslations("Portal.plan");
  const [answers, setAnswers] = useState(initialAnswers);
  const [shots, setShots] = useState(initialShots);
  const [draft, setDraft] = useState("");
  const [state, setState] = useState<"idle" | "dirty" | "saving" | "saved" | "error">("idle");

  const change = () => setState("dirty");
  const addShot = () => {
    const item = draft.trim();
    if (!item) return;
    setShots((s) => [...s, { item, done: false }].slice(0, 60));
    setDraft("");
    change();
  };

  async function save() {
    setState("saving");
    try {
      const res = await fetch("/api/portal/plan", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ project: slug, answers, shotList: shots }),
      });
      setState(res.ok ? "saved" : "error");
    } catch {
      setState("error");
    }
  }

  return (
    <div>
      <ol className="space-y-8">
        {questions.map((q, i) => (
          <li key={i}>
            <label htmlFor={`plan-q${i}`} className="flex gap-3 text-xl">
              <span className="readout pt-1.5 text-rec">{String(i + 1).padStart(2, "0")}</span>
              <span>{q.question}</span>
            </label>
            {q.help && <p className="readout ml-9 mt-1 text-muted-foreground">{q.help}</p>}
            <textarea
              id={`plan-q${i}`}
              value={answers[i] ?? ""}
              disabled={locked}
              maxLength={2000}
              rows={2}
              onChange={(e) => {
                const next = [...answers];
                next[i] = e.target.value;
                setAnswers(next);
                change();
              }}
              className="ml-9 mt-2 w-[calc(100%-2.25rem)] resize-y border-b border-foreground bg-transparent py-2 text-lg outline-none focus:border-rec disabled:border-border"
            />
          </li>
        ))}
      </ol>

      <div className="mt-14">
        <p className="display text-3xl lowercase">{t("shotList")}</p>
        <p className="mt-1 text-muted-foreground">{t("shotListHelp")}</p>
        <ul className="mt-4 divide-y divide-border border-y border-border">
          {shots.map((s, i) => (
            <li key={i} className="flex items-center gap-3 py-2.5">
              <button
                type="button"
                disabled={locked}
                aria-pressed={s.done}
                onClick={() => {
                  setShots((list) => list.map((x, j) => (j === i ? { ...x, done: !x.done } : x)));
                  change();
                }}
                className={cn("grid h-5 w-5 shrink-0 place-items-center border", s.done ? "border-rec bg-rec text-white" : "border-foreground")}
              >
                {s.done && <Check className="h-3.5 w-3.5" />}
              </button>
              <span className={cn("flex-1", s.done && "text-muted-foreground line-through")}>{s.item}</span>
              {!locked && (
                <button
                  type="button"
                  aria-label={t("remove")}
                  onClick={() => {
                    setShots((list) => list.filter((_, j) => j !== i));
                    change();
                  }}
                  className="p-1 text-muted-foreground hover:text-rec"
                >
                  <X className="h-4 w-4" />
                </button>
              )}
            </li>
          ))}
        </ul>
        {!locked && (
          <div className="mt-3 flex gap-3">
            <input
              value={draft}
              maxLength={200}
              onChange={(e) => setDraft(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  addShot();
                }
              }}
              placeholder={t("addShot")}
              aria-label={t("addShot")}
              className="flex-1 border-b border-foreground bg-transparent py-2 outline-none focus:border-rec"
            />
            <button type="button" onClick={addShot} className="readout border border-border px-3 hover:border-foreground">
              + {t("add")}
            </button>
          </div>
        )}
      </div>

      {!locked && (
        <div className="sticky bottom-4 mt-10 flex items-center gap-4 standalone:bottom-20">
          <button
            type="button"
            onClick={save}
            disabled={state === "saving" || state === "idle" || state === "saved"}
            className="bg-foreground px-6 py-3 text-background shadow-lg transition hover:bg-rec hover:text-white disabled:opacity-40"
          >
            {state === "saving" ? t("saving") : t("save")}
          </button>
          {state === "saved" && <span className="readout text-rec">{t("saved")}</span>}
          {state === "error" && (
            <span role="alert" className="text-rec">
              {t("error")}
            </span>
          )}
        </div>
      )}
    </div>
  );
}
