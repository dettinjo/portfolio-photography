"use client";

// The delivered photos: justified grid, a viewer with arrow keys and a
// download for every photo — plus revision rounds: collect change requests
// (optionally pinned to a spot), send them as a round, then compare before and
// after and approve or ask again.
import { useCallback, useEffect, useLayoutEffect, useRef, useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import { ChevronLeft, ChevronRight, Download, MapPin, Pencil, X } from "lucide-react";
import { cn } from "@/lib/utils";
import type { DeliveredPhoto, RevisionItem } from "@/lib/portal";

const bg = (p: DeliveredPhoto) =>
  p.placeholder ? { backgroundImage: `url(${p.placeholder})`, backgroundSize: "cover", backgroundColor: p.color ?? undefined } : { backgroundColor: p.color ?? undefined };

async function call(url: string, body: unknown, method = "POST") {
  const res = await fetch(url, { method, headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error ?? String(res.status));
  return data;
}

interface Props {
  slug: string;
  photos: DeliveredPhoto[];
  revisions: RevisionItem[];
  rounds: { included: number; used: number; left: number };
}

export function DeliveryGallery({ slug, photos, revisions: initial, rounds: initialRounds }: Props) {
  const t = useTranslations("Portal.delivery");
  const r = useTranslations("Portal.revisions");
  const locale = useLocale();
  const [open, setOpen] = useState<number | null>(null);
  const [items, setItems] = useState(initial);
  const [rounds, setRounds] = useState(initialRounds);
  const [state, setState] = useState<"idle" | "sending" | "error">("idle");
  const go = useCallback((d: number) => setOpen((i) => (i === null ? i : Math.min(photos.length - 1, Math.max(0, i + d)))), [photos.length]);

  const drafts = items.filter((i) => i.status === "draft");
  const requested = items.filter((i) => i.status === "requested");
  const toReview = items.filter((i) => i.status === "done");
  const canRequest = rounds.left > 0;
  const openFor = (id: number) => items.filter((i) => i.photo === id && i.status !== "approved");

  async function sendRound() {
    if (!window.confirm(r("confirm", { count: drafts.length, round: rounds.used + 1 }))) return;
    setState("sending");
    try {
      const res = await call("/api/portal/revisions/submit", { project: slug });
      setItems((list) => list.map((i) => (i.status === "draft" ? { ...i, status: "requested", round: res.round } : i)));
      setRounds((x) => ({ ...x, used: res.round, left: Math.max(0, x.included - res.round) }));
      setState("idle");
    } catch {
      setState("error");
    }
  }

  return (
    <>
      {(items.length > 0 || rounds.included > 0) && (
        <div className="mb-8 flex flex-wrap items-center gap-x-6 gap-y-3 border-y border-border py-3">
          <span className="readout text-muted-foreground">
            {r("changes")} · {rounds.used > 0 ? r("rounds", { used: rounds.used, included: rounds.included }) : r("roundsLeft", { left: rounds.left })}
          </span>
          {toReview.length > 0 && (
            <span className="readout text-rec">
              <span className="rec-dot mr-2 align-middle" aria-hidden />
              {r("toReview", { count: toReview.length })}
            </span>
          )}
          {requested.length > 0 && <span className="text-muted-foreground">{r("sent", { round: requested[0].round })}</span>}
          {drafts.length > 0 && (
            <span className="ml-auto flex items-center gap-4">
              <span className="readout">{r("collected", { count: drafts.length })}</span>
              <button type="button" onClick={sendRound} disabled={state === "sending" || !canRequest} className="whitespace-nowrap bg-foreground px-4 py-2 text-sm text-background transition hover:bg-rec hover:text-white disabled:opacity-40">
                {state === "sending" ? r("sending") : `${r("send")} →`}
              </button>
            </span>
          )}
          {!canRequest && !drafts.length && !requested.length && !toReview.length && rounds.used > 0 && (
            <span className="text-muted-foreground">
              {r("noneLeft")}{" "}
              <a href={`/${locale === "de" ? "de/" : ""}c/${slug}/messages`} className="link-slide text-foreground">
                {r("writeMe")} →
              </a>
            </span>
          )}
          {state === "error" && (
            <span role="alert" className="text-rec">
              {r("error")}
            </span>
          )}
        </div>
      )}

      <div className="flex flex-wrap gap-1 [--row-h:200px] after:block after:flex-[999_1_0px] after:content-[''] sm:gap-1.5 sm:[--row-h:260px] lg:[--row-h:320px]">
        {photos.map((p, i) => {
          const ratio = p.width / p.height;
          const pending = openFor(p.id);
          const review = pending.some((x) => x.status === "done");
          return (
            <div key={p.id} className="group relative" style={{ flexGrow: ratio, flexBasis: `calc(${ratio} * var(--row-h))` }}>
              <button type="button" onClick={() => setOpen(i)} className={cn("relative block w-full overflow-hidden", review && "outline outline-2 outline-offset-2 outline-rec")} aria-label={p.filename}>
                <div style={{ paddingBottom: `${100 / ratio}%`, ...bg(p) }} />
                {/* eslint-disable-next-line @next/next/no-img-element -- access-checked /api/previews */}
                <img src={p.src} srcSet={p.srcSet} sizes="(max-width: 640px) 50vw, 30vw" alt={p.filename} loading={i < 6 ? "eager" : "lazy"} decoding="async" className="absolute inset-0 h-full w-full object-cover" />
              </button>
              {(pending.length > 0 || p.before) && (
                <span className={cn("readout pointer-events-none absolute left-2 top-2 flex items-center gap-1 px-1.5 py-0.5", review ? "bg-rec text-white" : "bg-background/90")}>
                  <Pencil className="h-3 w-3" /> {review ? r("revised") : pending.length || r("revised")}
                </span>
              )}
              <a
                href={p.original}
                download
                aria-label={`${t("original")}: ${p.filename}`}
                className="absolute right-2 top-2 grid h-9 w-9 place-items-center rounded-full bg-white/90 text-neutral-900 opacity-0 shadow transition hover:bg-rec hover:text-white focus:opacity-100 group-hover:opacity-100"
              >
                <Download className="h-4 w-4" />
              </a>
            </div>
          );
        })}
      </div>

      {open !== null && photos[open] && (
        <Viewer
          slug={slug}
          photos={photos}
          index={open}
          go={go}
          close={() => setOpen(null)}
          items={items.filter((i) => i.photo === photos[open].id && i.status !== "approved")}
          canRequest={canRequest}
          onItem={(item) => setItems((list) => [...list.filter((x) => x.id !== item.id), item])}
          onRemove={(id) => setItems((list) => list.filter((x) => x.id !== id))}
        />
      )}
    </>
  );
}

interface ViewerProps {
  slug: string;
  photos: DeliveredPhoto[];
  index: number;
  go: (d: number) => void;
  close: () => void;
  items: RevisionItem[];
  canRequest: boolean;
  onItem: (item: RevisionItem) => void;
  onRemove: (id: number) => void;
}

function Viewer({ slug, photos, index, go, close, items, canRequest, onItem, onRemove }: ViewerProps) {
  const t = useTranslations("Portal.delivery");
  const r = useTranslations("Portal.revisions");
  const photo = photos[index];
  const [split, setSplit] = useState(50);
  const [draft, setDraft] = useState("");
  const [pinMode, setPinMode] = useState(false);
  const [pin, setPin] = useState<{ x: number; y: number } | null>(null);
  const [again, setAgain] = useState<{ id: number; text: string } | null>(null);
  const [error, setError] = useState(false);
  const imgRef = useRef<HTMLImageElement>(null);
  const [box, setBox] = useState<{ left: number; top: number; width: number; height: number } | null>(null);

  useEffect(() => {
    setPin(null);
    setPinMode(false);
    setSplit(50);
    setAgain(null);
    for (const n of [photos[index + 1], photos[index - 1]]) if (n) new Image().src = n.large;
  }, [index, photos]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.target as HTMLElement)?.tagName === "TEXTAREA") return;
      if (e.key === "Escape") close();
      else if (e.key === "ArrowRight") go(1);
      else if (e.key === "ArrowLeft") go(-1);
    };
    window.addEventListener("keydown", onKey);
    const overflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", onKey);
      document.body.style.overflow = overflow;
    };
  }, [go, close]);

  // Where the photo actually sits in its object-contain box, so pins and the slider line up with it
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

  async function add() {
    if (!draft.trim()) return;
    try {
      const res = await call("/api/portal/revisions", { project: slug, photo: photo.id, body: draft.trim(), x: pin?.x, y: pin?.y });
      onItem(res.revision);
      setDraft("");
      setPin(null);
      setError(false);
    } catch {
      setError(true);
    }
  }

  async function review(id: number, verdict: "approve" | "changes", body?: string) {
    try {
      const res = await call("/api/portal/revisions/review", { project: slug, id, verdict, body });
      const reviewed = items.find((i) => i.id === id);
      onRemove(id);
      if (verdict === "approve" && reviewed) onItem({ ...reviewed, status: "approved" });
      if (res.draft) onItem(res.draft);
      setAgain(null);
      setError(false);
    } catch {
      setError(true);
    }
  }

  async function remove(id: number) {
    try {
      await call("/api/portal/revisions", { project: slug, id }, "DELETE");
      onRemove(id);
    } catch {
      setError(true);
    }
  }

  const pinned = items.filter((i) => i.x !== null && i.y !== null);
  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-neutral-950 text-white md:flex-row" role="dialog" aria-modal aria-label={photo.filename}>
      <div className="relative flex min-h-0 flex-1 items-center justify-center p-2 sm:p-6">
        {/* eslint-disable-next-line @next/next/no-img-element -- access-checked /api/previews */}
        <img ref={imgRef} src={photo.large} alt={photo.filename} onLoad={measure} className="h-full w-full select-none object-contain" draggable={false} />
        {box && (
          <div
            className={cn("absolute overflow-hidden", pinMode && "cursor-crosshair")}
            style={{ left: box.left, top: box.top, width: box.width, height: box.height }}
            onClick={(e) => {
              if (!pinMode) return;
              const rect = e.currentTarget.getBoundingClientRect();
              setPin({ x: (e.clientX - rect.left) / rect.width, y: (e.clientY - rect.top) / rect.height });
              setPinMode(false);
            }}
          >
            {photo.before && (
              <>
                {/* Before, revealed from the left up to the slider */}
                {/* eslint-disable-next-line @next/next/no-img-element -- access-checked /api/previews */}
                <img src={photo.before} alt="" className="pointer-events-none absolute inset-0 h-full w-full object-cover" style={{ clipPath: `inset(0 ${100 - split}% 0 0)` }} />
                <span className="pointer-events-none absolute inset-y-0 w-0.5 bg-white shadow" style={{ left: `${split}%` }} />
                <span className="readout pointer-events-none absolute left-2 top-2 bg-black/60 px-1.5 py-0.5">{r("before")}</span>
                <span className="readout pointer-events-none absolute right-2 top-2 bg-black/60 px-1.5 py-0.5">{r("after")}</span>
              </>
            )}
            {pinned.map((n) => (
              <span
                key={n.id}
                className="absolute grid h-6 w-6 -translate-x-1/2 -translate-y-1/2 place-items-center rounded-full border-2 border-white bg-rec font-mono text-[10px] text-white shadow"
                style={{ left: `${(n.x as number) * 100}%`, top: `${(n.y as number) * 100}%` }}
                title={n.body}
              >
                {items.indexOf(n) + 1}
              </span>
            ))}
            {pin && <span className="absolute h-6 w-6 -translate-x-1/2 -translate-y-1/2 animate-pulse rounded-full border-2 border-dashed border-white bg-rec/60" style={{ left: `${pin.x * 100}%`, top: `${pin.y * 100}%` }} />}
          </div>
        )}
        {photo.before && box && (
          <input
            type="range"
            min={0}
            max={100}
            value={split}
            onChange={(e) => setSplit(Number(e.target.value))}
            aria-label={`${r("before")} / ${r("after")}`}
            className="absolute bottom-3 left-1/2 w-2/3 max-w-sm -translate-x-1/2 accent-[hsl(var(--rec))]"
          />
        )}
        {pinMode && <p className="readout pointer-events-none absolute left-1/2 top-4 -translate-x-1/2 bg-rec px-3 py-1 text-white">{r("pinHint")}</p>}
        <button type="button" onClick={() => go(-1)} disabled={index === 0} className="absolute left-2 top-1/2 -translate-y-1/2 p-2 text-white/70 hover:text-white disabled:opacity-20" aria-label={t("previous")}>
          <ChevronLeft className="h-7 w-7" />
        </button>
        <button type="button" onClick={() => go(1)} disabled={index === photos.length - 1} className="absolute right-2 top-1/2 -translate-y-1/2 p-2 text-white/70 hover:text-white disabled:opacity-20" aria-label={t("next")}>
          <ChevronRight className="h-7 w-7" />
        </button>
      </div>

      <aside className="flex max-h-[48dvh] w-full shrink-0 flex-col border-t border-white/10 bg-neutral-900 md:max-h-none md:w-96 md:border-l md:border-t-0">
        <div className="flex items-center justify-between gap-3 border-b border-white/10 p-4">
          <div className="min-w-0">
            <p className="readout text-white/50">
              {String(index + 1).padStart(2, "0")} / {String(photos.length).padStart(2, "0")}
            </p>
            <p className="truncate font-mono text-sm">{photo.filename}</p>
          </div>
          <button type="button" onClick={close} className="p-2 text-white/70 hover:text-white" aria-label={t("close")}>
            <X className="h-5 w-5" />
          </button>
        </div>
        <div className="flex gap-2 border-b border-white/10 p-4">
          <a href={photo.original} download className="readout flex items-center gap-1.5 bg-white px-3 py-1.5 text-neutral-900 transition hover:bg-rec hover:text-white">
            <Download className="h-3.5 w-3.5" /> {t("original")}
          </a>
          <a href={photo.web} download className="readout flex items-center gap-1.5 border border-white/40 px-3 py-1.5 transition hover:border-white">
            {t("web")}
          </a>
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto p-4">
          {items.length > 0 && (
            <ol className="space-y-4">
              {items.map((n, i) => (
                <li key={n.id} className="text-sm">
                  <p className="readout flex items-center gap-2 text-white/50">
                    <span className="inline-flex items-center gap-0.5 text-rec">
                      {n.x !== null && <MapPin className="h-3 w-3" />}
                      {i + 1}
                    </span>
                    {r(`status.${n.status === "changes" ? "draft" : n.status}`)}
                  </p>
                  <p className="mt-1">
                    <span className="text-white/60">{n.author}:</span> {n.body}
                  </p>
                  {n.status === "draft" && n.mine && (
                    <button type="button" onClick={() => remove(n.id)} className="readout mt-1 text-white/40 hover:text-rec">
                      {r("delete")}
                    </button>
                  )}
                  {n.status === "done" &&
                    (again?.id === n.id ? (
                      <div className="mt-2">
                        <textarea
                          value={again.text}
                          onChange={(e) => setAgain({ id: n.id, text: e.target.value })}
                          placeholder={r("notRightPlaceholder")}
                          aria-label={r("notRightPlaceholder")}
                          rows={2}
                          maxLength={1000}
                          className="w-full resize-none border-b border-white/30 bg-transparent py-1 outline-none focus:border-rec"
                        />
                        <button type="button" disabled={!again.text.trim()} onClick={() => review(n.id, "changes", again.text.trim())} className="readout mt-2 bg-white px-3 py-1.5 text-neutral-900 hover:bg-rec hover:text-white disabled:opacity-40">
                          {r("submitAgain")}
                        </button>
                      </div>
                    ) : (
                      <div className="mt-2 flex gap-2">
                        <button type="button" onClick={() => review(n.id, "approve")} className="readout bg-rec px-3 py-1.5 text-white">
                          ✓ {r("approve")}
                        </button>
                        {canRequest && (
                          <button type="button" onClick={() => setAgain({ id: n.id, text: "" })} className="readout border border-white/40 px-3 py-1.5 hover:border-white">
                            {r("notRight")}
                          </button>
                        )}
                      </div>
                    ))}
                </li>
              ))}
            </ol>
          )}
          {error && (
            <p role="alert" className="mt-3 text-sm text-rec">
              {r("error")}
            </p>
          )}
        </div>

        {canRequest && (
          <div className="border-t border-white/10 p-4">
            <p className="readout text-white/50">{r("request")}</p>
            <textarea
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              placeholder={r("placeholder")}
              aria-label={r("request")}
              rows={2}
              maxLength={1000}
              className="mt-2 w-full resize-none border-b border-white/30 bg-transparent py-2 text-sm outline-none placeholder:text-white/40 focus:border-rec"
            />
            <div className="mt-3 flex items-center justify-between gap-3">
              <button
                type="button"
                onClick={() => (pin ? setPin(null) : setPinMode((m) => !m))}
                className={cn("readout flex items-center gap-1.5 transition", pin || pinMode ? "text-rec" : "text-white/60 hover:text-white")}
              >
                <MapPin className="h-3.5 w-3.5" /> {pin ? r("removePin") : pinMode ? r("pinHint") : r("pin")}
              </button>
              <button type="button" onClick={add} disabled={!draft.trim()} className="bg-white px-3 py-1.5 text-sm text-neutral-900 transition hover:bg-rec hover:text-white disabled:opacity-40">
                {r("add")}
              </button>
            </div>
          </div>
        )}
      </aside>
    </div>
  );
}
