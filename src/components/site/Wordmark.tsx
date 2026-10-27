// "joel dettinger●" — lowercase, condensed, with the recording dot.
export function Wordmark({ name, className = "" }: { name: string; className?: string }) {
  return (
    <span className={`display inline-flex items-baseline gap-1 text-[1.6rem] lowercase leading-none tracking-normal ${className}`}>
      {name}
      <span aria-hidden className="inline-block h-1.5 w-1.5 translate-y-[-0.15em] rounded-full bg-rec" />
    </span>
  );
}
