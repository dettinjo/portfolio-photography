// "(02) — ROLLS ............ 003 FRAMES" — numbered section label.
export function SectionLabel({ n, children, aside }: { n: number; children: React.ReactNode; aside?: React.ReactNode }) {
  return (
    <div className="readout flex items-center gap-3 text-muted-foreground">
      <span className="text-foreground">({String(n).padStart(2, "0")})</span>
      <span>{children}</span>
      <span className="h-px flex-1 bg-border" aria-hidden />
      {aside && <span>{aside}</span>}
    </div>
  );
}
