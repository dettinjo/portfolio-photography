"use client";

import { useRef, useState } from "react";
import { useTranslations } from "next-intl";
import { ImagePlus, X } from "lucide-react";
import type { MoodImage } from "@/lib/portal";

const MAX = 30;
const MAX_BYTES = 15 * 1024 * 1024;
const TYPES = ["image/jpeg", "image/png", "image/webp", "image/gif"];

// Images as loose prints on a board; drop or pick files to add more.
export function Moodboard({ slug, images: initial, locked }: { slug: string; images: MoodImage[]; locked: boolean }) {
  const t = useTranslations("Portal.plan");
  const [images, setImages] = useState(initial);
  const [busy, setBusy] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const input = useRef<HTMLInputElement>(null);

  async function upload(files: FileList | File[]) {
    setError(null);
    const list = [...files];
    const room = MAX - images.length;
    if (room <= 0) return setError(t("full"));
    for (const file of list.slice(0, room)) {
      if (!TYPES.includes(file.type) || file.size > MAX_BYTES) {
        setError(t("tooBig", { name: file.name }));
        continue;
      }
      setBusy((n) => n + 1);
      try {
        const form = new FormData();
        form.set("project", slug);
        form.set("file", file);
        const res = await fetch("/api/portal/files", { method: "POST", body: form });
        if (!res.ok) throw new Error();
        const { file: added } = await res.json();
        setImages((imgs) => [...imgs, added]);
      } catch {
        setError(t("tooBig", { name: file.name }));
      } finally {
        setBusy((n) => n - 1);
      }
    }
    if (list.length > room) setError(t("full"));
  }

  async function remove(id: number) {
    const res = await fetch("/api/portal/files", {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ project: slug, id }),
    });
    if (res.ok) setImages((imgs) => imgs.filter((i) => i.id !== id));
  }

  return (
    <div
      onDragOver={(e) => !locked && e.preventDefault()}
      onDrop={(e) => {
        if (locked) return;
        e.preventDefault();
        void upload(e.dataTransfer.files);
      }}
    >
      <p className="readout mb-4 text-muted-foreground" aria-live="polite">
        {String(images.length).padStart(2, "0")}/{MAX}
      </p>
      <div className="grid grid-cols-3 gap-3 sm:grid-cols-4 lg:grid-cols-5">
        {images.map((img, i) => (
          <figure
            key={img.id}
            className="group relative bg-[#fbfaf7] p-1.5 pb-3 shadow-[0_8px_20px_-10px_rgba(0,0,0,0.4)] transition hover:z-10 hover:rotate-0 hover:scale-105"
            style={{ transform: `rotate(${[-3, 2, -1.5, 3, -2.5, 1][i % 6]}deg)` }}
          >
            <a href={img.full} target="_blank" rel="noopener noreferrer">
              {/* eslint-disable-next-line @next/next/no-img-element -- access-checked /api/portal/files */}
              <img src={img.thumb} alt="" loading="lazy" className="aspect-square w-full object-cover" />
            </a>
            {img.mine && !locked && (
              <button
                type="button"
                onClick={() => remove(img.id)}
                aria-label={t("deleteImage")}
                className="absolute -right-2 -top-2 grid h-6 w-6 place-items-center rounded-full bg-foreground text-background opacity-0 transition group-hover:opacity-100 focus:opacity-100"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            )}
          </figure>
        ))}
        {!locked && images.length < MAX && (
          <button
            type="button"
            onClick={() => input.current?.click()}
            className="flex aspect-square flex-col items-center justify-center gap-2 border border-dashed border-foreground/40 text-muted-foreground transition hover:border-rec hover:text-rec"
          >
            <ImagePlus className="h-6 w-6" />
            <span className="readout">{busy ? t("uploading", { n: busy }) : t("upload")}</span>
          </button>
        )}
      </div>
      <input
        ref={input}
        type="file"
        accept={TYPES.join(",")}
        multiple
        hidden
        onChange={(e) => {
          if (e.target.files) void upload(e.target.files);
          e.target.value = "";
        }}
      />
      {error && (
        <p role="alert" className="mt-3 text-rec">
          {error}
        </p>
      )}
    </div>
  );
}
