// Sets the first occurrence of `word` in `text` in the italic accent serif.
export function AccentWord({ text, word, className = "" }: { text: string; word: string; className?: string }) {
  const at = word ? text.indexOf(word) : -1;
  if (at === -1) return <>{text}</>;
  return (
    <>
      {text.slice(0, at)}
      <span className={`accent-serif ${className}`}>{word}</span>
      {text.slice(at + word.length)}
    </>
  );
}
