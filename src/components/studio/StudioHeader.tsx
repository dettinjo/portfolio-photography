import Link from "next/link";

// "studio●" wordmark with quick ways out to the admin and the site.
export function StudioHeader({ title, back }: { title: string; back?: { href: string; label: string } }) {
  return (
    <header className="mb-8">
      <div className="readout flex items-center gap-3 text-muted-foreground">
        <span className="display text-xl normal-case tracking-normal text-foreground">
          studio<span className="text-rec">●</span>
        </span>
        <span className="h-px flex-1 bg-border" aria-hidden />
        <Link href="/admin" className="hover:text-foreground">admin ↗</Link>
        <Link href="/" className="hover:text-foreground">site ↗</Link>
      </div>
      {back && (
        <Link href={back.href} className="readout mt-6 inline-block text-muted-foreground hover:text-foreground">
          ← {back.label}
        </Link>
      )}
      <h1 className="display display-xl mt-4 text-5xl lowercase sm:text-6xl">{title}</h1>
    </header>
  );
}
