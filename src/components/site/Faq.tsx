import type { FaqItem } from "@/lib/about";

// Questions as numbered, foldable rows; the "+" turns into a "×" when open.
export function Faq({ items }: { items: FaqItem[] }) {
  return (
    <div className="divide-y divide-border border-y border-border">
      {items.map((item, i) => (
        <details key={item.question} className="group">
          <summary className="flex cursor-pointer list-none items-baseline gap-4 py-5 text-xl transition hover:text-rec sm:text-2xl [&::-webkit-details-marker]:hidden">
            <span className="readout shrink-0 text-muted-foreground">{String(i + 1).padStart(2, "0")}</span>
            <span className="flex-1">{item.question}</span>
            <span
              aria-hidden
              className="font-mono text-2xl text-rec transition-transform duration-300 group-open:rotate-45"
            >
              +
            </span>
          </summary>
          <div className="space-y-3 pb-6 pl-10 pr-8 leading-relaxed text-muted-foreground">
            {item.answer.map((p) => (
              <p key={p}>{p}</p>
            ))}
          </div>
        </details>
      ))}
    </div>
  );
}
