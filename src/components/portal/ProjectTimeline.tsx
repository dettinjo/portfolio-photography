import { getTranslations } from "next-intl/server";
import { STAGES, stageIndex, type Stage } from "@/lib/stages";

// The lifecycle as a strip of numbered frames: done ones filled, the current
// one recording, the rest still blank. Vertical on phones, a strip on wider screens.
export async function ProjectTimeline({ stage }: { stage: Stage }) {
  const t = await getTranslations("Portal");
  const current = stageIndex(stage);

  return (
    <ol className="grid gap-px border border-border bg-border sm:grid-cols-4 lg:grid-cols-6">
      {STAGES.map((s, i) => {
        const done = i < current;
        const now = i === current;
        return (
          <li
            key={s}
            aria-current={now ? "step" : undefined}
            className={`flex items-center gap-3 p-3 sm:min-h-24 sm:flex-col sm:items-start sm:justify-between ${
              now ? "bg-foreground text-background" : done ? "bg-muted" : "bg-background text-muted-foreground"
            }`}
          >
            <span className="readout flex items-center gap-2">
              {String(i + 1).padStart(2, "0")}
              {now && <span className="rec-dot" aria-hidden />}
              {done && <span aria-hidden>✓</span>}
            </span>
            <span className={now ? "display text-xl lowercase" : "text-sm"}>{t(`stages.${s}.label`)}</span>
            {now && <span className="readout ml-auto text-rec sm:ml-0">{t("project.now")}</span>}
          </li>
        );
      })}
    </ol>
  );
}
