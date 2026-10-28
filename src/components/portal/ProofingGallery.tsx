"use client";

// The client's selection: justified grid with ♥ per photo, filters, a counter
// against the included number, two-up compare, and a fullscreen viewer where
// notes can be pinned to a spot on the photo. Picks save immediately
// (optimistic). Without a connection they wait on the device and are sent when
// it is back; a refused pick is reverted. "send" locks the selection.
import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { useTranslations } from "next-intl";
import { ChevronLeft, ChevronRight, Columns2, Heart, MapPin, MessageCircle, X } from "lucide-react";
import { cn } from "@/lib/utils";
import type { ProofComment, ProofPhoto } from "@/lib/portal";

type Filter = "all" | "picked" | "unpicked" | "commented";

interface Props {
  slug: string;
  photos: ProofPhoto[];
  pickedBy: Record<number, string[]>;
  mine: number[];
  comments: ProofComment[];
  quota: number | null;
  extraPrice: string | null;
  myName: string;
  locked: boolean;
}

class HttpError extends Error {}

async function post(url: string, body: unknown, method = "POST") {
  const res = await fetch(url, { method, headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
  if (!res.ok) throw new HttpError(String(res.status));
  return res.json();
}

// Picks made offline: photo id → picked, the latest intent wins
type Queue = Record<string, boolean>;
const queueKey = (slug: string) => `picks-queue:${slug}`;
function readQueue(slug: string): Queue {
  try {
    return JSON.parse(localStorage.getItem(queueKey(slug)) ?? "{}") as Queue;
  } catch {
    return {};
  }
}
function writeQueue(slug: string, q: Queue) {
  try {
    if (Object.keys(q).length) localStorage.setItem(queueKey(slug), JSON.stringify(q));
    else localStorage.removeItem(queueKey(slug));
  } catch {
    // Storage blocked: the pick then simply is not kept
  }
}

const bg = (p: ProofPhoto) =>
  p.placeholder
    ? { backgroundImage: `url(${p.placeholder})`, backgroundSize: "cover", backgroundColor: p.color ?? undefined }
    : { backgroundColor: p.color ?? undefined };

export function ProofingGallery({ slug, photos, pickedBy, mine, comments: initialComments, quota, extraPrice, myName, locked: initiallyLocked }: Props) {
  const t = useTranslations("Portal.proofing");
  const [picked, setPicked] = useState(() => new Set(mine));
  const [comments, setComments] = useState(initialComments);
  const [filter, setFilter] = useState<Filter>("all");
  const [open, setOpen] = useState<number | null>(null);
  const [compare, setCompare] = useState<number[] | null>(null);
  const [error, setError] = useState(false);
  const [confirming, setConfirming] = useState(false);
  const [sending, setSending] = useState(false);
  const [locked, setLocked] = useState(initiallyLocked);
  const [pending, setPending] = useState(0);
  const flushing = useRef(false);

  const applyPick = useCallback((id: number, on: boolean) => {
    setPicked((s) => {
      const copy = new Set(s);
      if (on) copy.add(id);
      else copy.delete(id);
      return copy;
    });
  }, []);

  // Send what waited on the device; stop at the first network failure
  const flush = useCallback(async () => {
    if (flushing.current) return;
    flushing.current = true;
    try {
      for (const [id, on] of Object.entries(readQueue(slug))) {
        try {
          await post("/api/portal/picks", { project: slug, photo: Number(id), picked: on });
        } catch (err) {
          if (!(err instanceof HttpError)) break;
          applyPick(Number(id), !on); // refused (e.g. selection already sent)
        }
        const q = readQueue(slug);
        if (q[id] === on) delete q[id];
        writeQueue(slug, q);
      }
    } finally {
      flushing.current = false;
      setPending(Object.keys(readQueue(slug)).length);
    }
  }, [slug, applyPick]);

  // Picks made offline earlier (the page may come from the offline copy) count right away
  useEffect(() => {
    const q = readQueue(slug);
    for (const [id, on] of Object.entries(q)) applyPick(Number(id), on);
    setPending(Object.keys(q).length);
    if (navigator.onLine) void flush();
    window.addEventListener("online", flush);
    return () => window.removeEventListener("online", flush);
  }, [slug, applyPick, flush]);

  // Other pickers' choices stay as loaded; mine follow the local state
  const others = useMemo(() => {
    const map: Record<number, string[]> = {};
    for (const [id, names] of Object.entries(pickedBy)) {
      const rest = mine.includes(Number(id)) ? removeOnce(names, myName) : names;
      if (rest.length) map[Number(id)] = rest;
    }
    return map;
  }, [pickedBy, mine, myName]);
  const isPicked = useCallback((id: number) => picked.has(id) || Boolean(others[id]), [picked, others]);
  const total = photos.filter((p) => isPicked(p.id)).length;
  const extra = quota !== null ? Math.max(0, total - quota) : 0;
  const notesFor = useCallback((id: number) => comments.filter((c) => c.photo === id), [comments]);

  const visible = photos.filter((p) =>
    filter === "picked" ? isPicked(p.id) : filter === "unpicked" ? !isPicked(p.id) : filter === "commented" ? notesFor(p.id).length > 0 : true,
  );

  const toggle = useCallback(
    async (id: number) => {
      if (locked) return;
      const next = !picked.has(id);
      applyPick(id, next);
      const queued = readQueue(slug);
      if (Object.keys(queued).length) {
        // Keep the order: once something waits, new picks wait behind it
        writeQueue(slug, { ...queued, [id]: next });
        setPending(Object.keys(readQueue(slug)).length);
        void flush();
        return;
      }
      try {
        await post("/api/portal/picks", { project: slug, photo: id, picked: next });
        setError(false);
      } catch (err) {
        if (err instanceof HttpError) {
          setError(true);
          applyPick(id, !next);
          return;
        }
        // No connection: keep the pick on the device
        writeQueue(slug, { ...readQueue(slug), [id]: next });
        setPending(Object.keys(readQueue(slug)).length);
      }
    },
    [locked, picked, slug, applyPick, flush],
  );

  async function addComment(photo: number, body: string, pin: { x: number; y: number } | null) {
    try {
      const res = await post("/api/portal/comments", { project: slug, photo, body, x: pin?.x, y: pin?.y });
      setComments((c) => [...c, res.comment]);
      setError(false);
      return true;
    } catch {
      setError(true);
      return false;
    }
  }

  async function deleteComment(id: number) {
    try {
      await post("/api/portal/comments", { project: slug, id }, "DELETE");
      setComments((c) => c.filter((x) => x.id !== id));
    } catch {
      setError(true);
    }
  }

  async function submit() {
    setSending(true);
    await flush();
    if (Object.keys(readQueue(slug)).length) {
      // Offline picks must reach the server before the selection is sent
      setError(true);
      setSending(false);
      return;
    }
    try {
      await post("/api/portal/submit", { project: slug });
      setLocked(true);
      setConfirming(false);
      window.location.reload();
    } catch {
      setError(true);
      setSending(false);
    }
  }

  const tileClick = (id: number) => {
    if (compare) {
      setCompare((c) => (c!.includes(id) ? c!.filter((x) => x !== id) : [...c!, id].slice(-2)));
      return;
    }
    setOpen(visible.findIndex((p) => p.id === id));
  };

  return (
    <>
      {/* Counter, filters and actions stay in reach while scrolling */}
      <div className="sticky top-14 z-20 -mx-4 mt-10 border-y border-border bg-background/90 px-4 py-2.5 backdrop-blur sm:-mx-6 sm:px-6 sm:py-3">
        <div className="flex flex-wrap items-center gap-x-4 gap-y-2 sm:gap-x-6">
          <div className="flex items-baseline gap-2 sm:gap-3">
            <span className={cn("font-mono text-xl tabular-nums sm:text-2xl", extra > 0 && "text-rec")}>
              {total}
              {quota !== null && <span className="text-muted-foreground">/{quota}</span>}
            </span>
            <span className="readout hidden text-muted-foreground sm:inline">{t("picked")}</span>
          </div>
          {quota !== null && (
            <div className="hidden h-1 w-32 bg-muted lg:block" aria-hidden>
              <div className={cn("h-full transition-all", extra ? "bg-rec" : "bg-foreground")} style={{ width: `${Math.min(100, (total / Math.max(1, quota)) * 100)}%` }} />
            </div>
          )}
          <div className="order-last -mx-4 flex w-[calc(100%+2rem)] gap-1.5 overflow-x-auto px-4 [scrollbar-width:none] sm:order-none sm:mx-0 sm:w-auto sm:flex-wrap sm:overflow-visible sm:px-0" role="group">
            {(["all", "picked", "unpicked", "commented"] as Filter[]).map((f) => (
              <button
                key={f}
                type="button"
                aria-pressed={filter === f}
                onClick={() => setFilter(f)}
                className={cn(
                  "readout shrink-0 border px-2.5 py-1 transition",
                  filter === f ? "border-foreground bg-foreground text-background" : "border-border hover:border-foreground",
                )}
              >
                {t(`filters.${f}`)}
              </button>
            ))}
          </div>
          <div className="ml-auto flex items-center gap-2 sm:gap-3">
            <button
              type="button"
              onClick={() => setCompare((c) => (c ? null : []))}
              aria-pressed={Boolean(compare)}
              aria-label={compare ? t("compareDone") : t("compare")}
              className={cn("readout flex items-center gap-1.5 border px-2.5 py-1.5 transition sm:py-1", compare ? "border-rec text-rec" : "border-border hover:border-foreground")}
            >
              <Columns2 className="h-3.5 w-3.5" /> <span className="hidden sm:inline">{compare ? t("compareDone") : t("compare")}</span>
            </button>
            {!locked && (
              <button
                type="button"
                disabled={!total}
                onClick={() => setConfirming(true)}
                className="whitespace-nowrap bg-foreground px-3 py-1.5 text-sm text-background transition hover:bg-rec hover:text-white disabled:opacity-40 sm:px-4 sm:py-2"
              >
                {t("submit")} →
              </button>
            )}
          </div>
        </div>
        {compare && <p className="readout mt-2 text-rec">{t("compareHint")}</p>}
        {extra > 0 && extraPrice && <p className="readout mt-2 text-rec">{t("extraNote", { extra, price: extraPrice })}</p>}
        {pending > 0 && (
          <p className="readout mt-2 text-muted-foreground" role="status">
            <span className="mr-2 inline-block h-1.5 w-1.5 rounded-full bg-rec align-middle" aria-hidden />
            {t("offlinePending", { count: pending })}
          </p>
        )}
        {error && (
          <p role="alert" className="mt-2 text-sm text-rec">
            {pending > 0 ? t("offlineSubmit") : t("error")}
          </p>
        )}
      </div>

      {visible.length ? (
        <div className="mt-6 flex flex-wrap gap-1 [--row-h:200px] after:block after:flex-[999_1_0px] after:content-[''] sm:gap-1.5 sm:[--row-h:240px] lg:[--row-h:280px]">
          {visible.map((p) => {
            const ratio = p.width / p.height;
            const mineNow = picked.has(p.id);
            const notes = notesFor(p.id).length;
            const comparing = compare?.includes(p.id);
            return (
              <div key={p.id} className="group relative" style={{ flexGrow: ratio, flexBasis: `calc(${ratio} * var(--row-h))` }}>
                <button
                  type="button"
                  onClick={() => tileClick(p.id)}
                  className={cn("relative block w-full overflow-hidden outline-offset-2", comparing && "outline outline-2 outline-rec")}
                  aria-label={p.filename}
                >
                  <div style={{ paddingBottom: `${100 / ratio}%`, ...bg(p) }} />
                  {/* eslint-disable-next-line @next/next/no-img-element -- access-checked /api/previews */}
                  <img src={p.src} srcSet={p.srcSet} sizes="(max-width: 640px) 50vw, 30vw" alt={p.filename} loading="lazy" decoding="async" className="absolute inset-0 h-full w-full object-cover" />
                  <span className="readout pointer-events-none absolute bottom-2 left-2 text-white opacity-0 drop-shadow transition group-hover:opacity-100">
                    {p.filename}
                  </span>
                </button>
                {notes > 0 && (
                  <span className="readout pointer-events-none absolute left-2 top-2 flex items-center gap-1 bg-background/90 px-1.5 py-0.5">
                    <MessageCircle className="h-3 w-3" /> {notes}
                  </span>
                )}
                {others[p.id] && (
                  <span className="readout pointer-events-none absolute right-12 top-2 bg-background/90 px-1.5 py-0.5" title={t("by", { names: others[p.id].join(", ") })}>
                    ♥ {others[p.id].map((n) => n[0]).join("")}
                  </span>
                )}
                <HeartButton active={mineNow} disabled={locked} onClick={() => toggle(p.id)} label={mineNow ? t("picked1") : t("pick")} className="absolute right-2 top-2" />
              </div>
            );
          })}
        </div>
      ) : (
        <p className="mt-10 text-muted-foreground">{t("empty")}</p>
      )}

      {open !== null && visible[open] && (
        <Viewer
          photos={visible}
          index={open}
          onIndex={setOpen}
          onClose={() => setOpen(null)}
          picked={picked}
          others={others}
          toggle={toggle}
          notesFor={notesFor}
          addComment={addComment}
          deleteComment={deleteComment}
          locked={locked}
        />
      )}

      {compare && compare.length === 2 && (
        <div className="fixed inset-0 z-50 flex flex-col bg-neutral-950 text-white" role="dialog" aria-modal>
          <div className="flex items-center justify-between p-3">
            <span className="readout text-white/60">{t("compare")}</span>
            <button type="button" onClick={() => setCompare([])} className="p-2" aria-label={t("close")}>
              <X className="h-5 w-5" />
            </button>
          </div>
          <div className="grid min-h-0 flex-1 grid-rows-2 gap-2 p-2 md:grid-cols-2 md:grid-rows-1">
            {compare.map((id) => {
              const p = photos.find((x) => x.id === id)!;
              return (
                <div key={id} className="relative flex min-h-0 items-center justify-center">
                  {/* eslint-disable-next-line @next/next/no-img-element -- access-checked /api/previews */}
                  <img src={p.large} alt={p.filename} className="max-h-full max-w-full object-contain" />
                  <span className="readout absolute bottom-2 left-2 text-white/80">{p.filename}</span>
                  <HeartButton active={picked.has(id)} disabled={locked} onClick={() => toggle(id)} label={picked.has(id) ? t("picked1") : t("pick")} className="absolute right-2 top-2" />
                </div>
              );
            })}
          </div>
        </div>
      )}

      {confirming && (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/50 p-4 sm:items-center" role="dialog" aria-modal>
          <div className="w-full max-w-md bg-background p-6 shadow-xl">
            <p className="display text-4xl lowercase">{t("confirmTitle", { count: total })}</p>
            <p className="mt-4 text-muted-foreground">{t("confirmText")}</p>
            {extra > 0 && extraPrice && <p className="mt-3 text-rec">{t("confirmExtra", { extra, price: extraPrice })}</p>}
            <div className="mt-8 flex flex-wrap items-center gap-4">
              <button type="button" onClick={submit} disabled={sending} className="bg-foreground px-5 py-2.5 text-background transition hover:bg-rec hover:text-white disabled:opacity-50">
                {t("confirm")} →
              </button>
              <button type="button" onClick={() => setConfirming(false)} className="link-slide pb-0.5">
                {t("cancel")}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

function removeOnce(list: string[], value: string) {
  const i = list.indexOf(value);
  return i === -1 ? list : [...list.slice(0, i), ...list.slice(i + 1)];
}

function HeartButton({ active, disabled, onClick, label, className }: { active: boolean; disabled: boolean; onClick: () => void; label: string; className?: string }) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      aria-pressed={active}
      aria-label={label}
      title={label}
      className={cn(
        "grid h-9 w-9 place-items-center rounded-full shadow transition active:scale-90 disabled:cursor-default",
        active ? "bg-rec text-white" : "bg-white/90 text-neutral-900 hover:bg-white",
        className,
      )}
    >
      <Heart className={cn("h-4 w-4 transition", active && "scale-110 fill-current")} />
    </button>
  );
}

interface ViewerProps {
  photos: ProofPhoto[];
  index: number;
  onIndex: (i: number) => void;
  onClose: () => void;
  picked: Set<number>;
  others: Record<number, string[]>;
  toggle: (id: number) => void;
  notesFor: (id: number) => ProofComment[];
  addComment: (photo: number, body: string, pin: { x: number; y: number } | null) => Promise<boolean>;
  deleteComment: (id: number) => void;
  locked: boolean;
}

function Viewer({ photos, index, onIndex, onClose, picked, others, toggle, notesFor, addComment, deleteComment, locked }: ViewerProps) {
  const t = useTranslations("Portal.proofing");
  const photo = photos[index];
  const notes = notesFor(photo.id);
  const [draft, setDraft] = useState("");
  const [pinMode, setPinMode] = useState(false);
  const [pin, setPin] = useState<{ x: number; y: number } | null>(null);
  const [saving, setSaving] = useState(false);
  const imgRef = useRef<HTMLImageElement>(null);
  const [box, setBox] = useState<{ left: number; top: number; width: number; height: number } | null>(null);

  const go = useCallback((d: number) => {
    const n = index + d;
    if (n >= 0 && n < photos.length) onIndex(n);
  }, [index, photos.length, onIndex]);

  useEffect(() => {
    setPin(null);
    setPinMode(false);
    for (const n of [photos[index + 1], photos[index - 1]]) if (n) new Image().src = n.large;
  }, [index, photos]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.target as HTMLElement)?.tagName === "TEXTAREA") return;
      if (e.key === "Escape") onClose();
      else if (e.key === "ArrowRight") go(1);
      else if (e.key === "ArrowLeft") go(-1);
      else if (e.key.toLowerCase() === "p") toggle(photo.id);
    };
    window.addEventListener("keydown", onKey);
    const overflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", onKey);
      document.body.style.overflow = overflow;
    };
  }, [go, onClose, toggle, photo.id]);

  // Where the photo actually is inside its object-contain box, so pins sit on the image
  const measure = useCallback(() => {
    const img = imgRef.current;
    if (!img) return;
    const ratio = photo.width / photo.height;
    const w = Math.min(img.clientWidth, img.clientHeight * ratio);
    const h = w / ratio;
    setBox({ left: img.offsetLeft + (img.clientWidth - w) / 2, top: img.offsetTop + (img.clientHeight - h) / 2, width: w, height: h });
  }, [photo.width, photo.height]);
  useLayoutEffect(() => {
    measure();
    const ro = new ResizeObserver(measure);
    if (imgRef.current) ro.observe(imgRef.current);
    return () => ro.disconnect();
  }, [measure]);

  const placePin = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!pinMode) return;
    const rect = e.currentTarget.getBoundingClientRect();
    setPin({ x: (e.clientX - rect.left) / rect.width, y: (e.clientY - rect.top) / rect.height });
    setPinMode(false);
  };

  async function send() {
    if (!draft.trim()) return;
    setSaving(true);
    if (await addComment(photo.id, draft.trim(), pin)) {
      setDraft("");
      setPin(null);
    }
    setSaving(false);
  }

  const pinned = notes.filter((n) => n.x !== null && n.y !== null);
  const mineNow = picked.has(photo.id);

  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-neutral-950 text-white md:flex-row" role="dialog" aria-modal aria-label={photo.filename}>
      <div className="relative flex min-h-0 flex-1 items-center justify-center p-2 sm:p-6">
        {/* eslint-disable-next-line @next/next/no-img-element -- access-checked /api/previews */}
        <img ref={imgRef} src={photo.large} alt={photo.filename} onLoad={measure} className="h-full w-full select-none object-contain" draggable={false} />
        {box && (
          <div
            className={cn("absolute", pinMode && "cursor-crosshair")}
            style={{ left: box.left, top: box.top, width: box.width, height: box.height }}
            onClick={placePin}
          >
            {pinned.map((n) => (
              <span
                key={n.id}
                className="absolute grid h-6 w-6 -translate-x-1/2 -translate-y-1/2 place-items-center rounded-full border-2 border-white bg-rec font-mono text-[10px] text-white shadow"
                style={{ left: `${(n.x as number) * 100}%`, top: `${(n.y as number) * 100}%` }}
                title={n.body}
              >
                {notes.indexOf(n) + 1}
              </span>
            ))}
            {pin && (
              <span className="absolute h-6 w-6 -translate-x-1/2 -translate-y-1/2 animate-pulse rounded-full border-2 border-dashed border-white bg-rec/60" style={{ left: `${pin.x * 100}%`, top: `${pin.y * 100}%` }} />
            )}
          </div>
        )}
        {pinMode && <p className="readout pointer-events-none absolute left-1/2 top-4 -translate-x-1/2 bg-rec px-3 py-1 text-white">{t("pinHint")}</p>}
        <button type="button" onClick={() => go(-1)} disabled={index === 0} className="absolute left-2 top-1/2 -translate-y-1/2 p-2 text-white/70 hover:text-white disabled:opacity-20" aria-label={t("previous")}>
          <ChevronLeft className="h-7 w-7" />
        </button>
        <button type="button" onClick={() => go(1)} disabled={index === photos.length - 1} className="absolute right-2 top-1/2 -translate-y-1/2 p-2 text-white/70 hover:text-white disabled:opacity-20" aria-label={t("next")}>
          <ChevronRight className="h-7 w-7" />
        </button>
      </div>

      <aside className="flex max-h-[45dvh] w-full shrink-0 flex-col border-t border-white/10 bg-neutral-900 md:max-h-none md:w-96 md:border-l md:border-t-0">
        <div className="flex items-center justify-between gap-3 border-b border-white/10 p-4">
          <div className="min-w-0">
            <p className="readout text-white/50">
              {String(index + 1).padStart(2, "0")} / {String(photos.length).padStart(2, "0")}
            </p>
            <p className="truncate font-mono text-sm">{photo.filename}</p>
          </div>
          <div className="flex items-center gap-2">
            <HeartButton active={mineNow} disabled={locked} onClick={() => toggle(photo.id)} label={mineNow ? t("picked1") : t("pick")} />
            <button type="button" onClick={onClose} className="p-2 text-white/70 hover:text-white" aria-label={t("close")}>
              <X className="h-5 w-5" />
            </button>
          </div>
        </div>
        {others[photo.id] && <p className="readout px-4 pt-3 text-white/60">{t("by", { names: others[photo.id].join(", ") })}</p>}

        <div className="min-h-0 flex-1 overflow-y-auto p-4">
          <p className="readout text-white/50">{t("notes")}</p>
          {notes.length ? (
            <ol className="mt-3 space-y-3">
              {notes.map((n, i) => (
                <li key={n.id} className={cn("text-sm", n.resolved && "opacity-50")}>
                  <span className="readout mr-2 inline-flex items-center gap-0.5 text-rec">
                    {n.x !== null && <MapPin className="h-3 w-3" />}
                    {i + 1}
                  </span>
                  <span className="text-white/60">{n.mine ? t("you") : n.author}:</span> {n.body}
                  {n.mine && !locked && (
                    <button type="button" onClick={() => deleteComment(n.id)} className="readout ml-2 text-white/40 hover:text-rec">
                      {t("delete")}
                    </button>
                  )}
                </li>
              ))}
            </ol>
          ) : (
            <p className="mt-2 text-sm text-white/50">{t("noNotes")}</p>
          )}
        </div>

        {!locked && (
          <div className="border-t border-white/10 p-4">
            <textarea
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              placeholder={t("placeholder")}
              rows={2}
              maxLength={1000}
              className="w-full resize-none border-b border-white/30 bg-transparent py-2 text-sm outline-none placeholder:text-white/40 focus:border-rec"
            />
            <div className="mt-3 flex items-center justify-between gap-3">
              <button
                type="button"
                onClick={() => (pin ? setPin(null) : setPinMode((m) => !m))}
                className={cn("readout flex items-center gap-1.5 transition", pin || pinMode ? "text-rec" : "text-white/60 hover:text-white")}
              >
                <MapPin className="h-3.5 w-3.5" /> {pin ? t("removePin") : pinMode ? t("pinHint") : t("pin")}
              </button>
              <button type="button" onClick={send} disabled={!draft.trim() || saving} className="bg-white px-3 py-1.5 text-sm text-neutral-900 transition hover:bg-rec hover:text-white disabled:opacity-40">
                {t("add")}
              </button>
            </div>
          </div>
        )}
        <p className="readout hidden border-t border-white/10 px-4 py-2 text-white/40 md:block">{t("keys")}</p>
      </aside>
    </div>
  );
}
