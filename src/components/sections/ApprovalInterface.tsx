"use client";

import { useState } from "react";
import Image from "next/image";
import { submitSelections } from "@/lib/payload";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { CheckCircle, AlertCircle, Loader2, Download, Images } from "lucide-react";

// ---------- Types ----------

interface ImageItem {
  id: number;
  url: string;
  filename: string;
  alternativeText?: string | null;
  width: number;
  height: number;
}

interface AlbumMeta {
  slug: string;
  title: string;
  clientName?: string;
  approvalStatus: string;
  existingSelections: Array<{ filename: string; comment?: string }>;
  selectionMin: number;
  selectionMax: number;
  allowDownloads: boolean;
  approvalTerms?: string;
}

interface ApprovalInterfaceProps {
  album: AlbumMeta;
  images: ImageItem[];
  token: string;
}

// ---------- Component ----------

export function ApprovalInterface({ album, images, token }: ApprovalInterfaceProps) {
  const t = useTranslations("photography.ApprovalPage");

  const [selected, setSelected] = useState<Record<string, boolean>>(() =>
    Object.fromEntries(album.existingSelections.map((s) => [s.filename, true]))
  );
  const [comments, setComments] = useState<Record<string, string>>(() =>
    Object.fromEntries(album.existingSelections.map((s) => [s.filename, s.comment ?? ""]))
  );
  const [consentGiven, setConsentGiven] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [done, setDone] = useState(
    album.approvalStatus === "submitted" || album.approvalStatus === "approved"
  );
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const selectedCount = Object.values(selected).filter(Boolean).length;
  const min = album.selectionMin;
  const max = album.selectionMax;

  const validationMessage = (() => {
    if (min > 0 && selectedCount < min) return t("validation.min", { count: min });
    if (max > 0 && selectedCount > max) return t("validation.max", { count: max });
    return null;
  })();

  const canSubmit =
    !submitting && !validationMessage && (selectedCount === 0 || consentGiven);

  const toggleImage = (filename: string) => {
    setSelected((prev) => ({ ...prev, [filename]: !prev[filename] }));
  };

  const handleSubmit = async () => {
    setSubmitting(true);
    setErrorMsg(null);

    const selections = images
      .filter((img) => selected[img.filename])
      .map((img) => ({ filename: img.filename, comment: comments[img.filename] ?? "" }));

    const result = await submitSelections({ token, selections, publicationConsent: consentGiven });

    if (result.ok) {
      setDone(true);
    } else {
      setErrorMsg(result.error ?? t("error"));
      setSubmitting(false);
    }
  };

  if (done) {
    return (
      <div className="container mx-auto max-w-2xl py-24 px-4 text-center">
        <CheckCircle className="h-20 w-20 text-green-500 mx-auto mb-6" />
        <h1 className="text-3xl font-bold">{t("success.title")}</h1>
        <p className="mt-4 text-muted-foreground">{t("success.message")}</p>
      </div>
    );
  }

  return (
    <div className="container mx-auto max-w-5xl py-12 px-4">
      <div className="mb-8">
        <h1 className="text-3xl font-bold">{album.title}</h1>
        {album.clientName && (
          <p className="mt-1 text-muted-foreground">
            {t("greeting", { name: album.clientName })}
          </p>
        )}
        <p className="mt-2 text-sm text-muted-foreground">
          {t("instructions")}
          {min > 0 && max > 0 && ` ${t("selectionRange", { min, max })}`}
          {min > 0 && max === 0 && ` ${t("selectionMin", { count: min })}`}
          {max > 0 && min === 0 && ` ${t("selectionMax", { count: max })}`}
        </p>
        <div className="mt-3 flex items-center gap-2 text-sm font-medium">
          <Images className="h-4 w-4" />
          <span>{t("selectedCount", { selected: selectedCount, total: images.length })}</span>
          {validationMessage && (
            <span className="text-destructive ml-2">— {validationMessage}</span>
          )}
        </div>
      </div>

      {/* Image grid */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3 mb-10">
        {images.map((img) => {
          const isSelected = !!selected[img.filename];
          return (
            <div key={img.filename} className="space-y-1">
              <button
                type="button"
                onClick={() => toggleImage(img.filename)}
                className={`relative block w-full aspect-[4/5] overflow-hidden rounded-md border-2 transition-all ${
                  isSelected
                    ? "border-foreground ring-2 ring-foreground ring-offset-2"
                    : "border-transparent opacity-70 hover:opacity-100"
                }`}
              >
                <Image
                  src={img.url}
                  alt={img.alternativeText ?? img.filename}
                  fill
                  sizes="(max-width: 768px) 50vw, 25vw"
                  className="object-cover"
                />
                {isSelected && (
                  <div className="absolute top-2 right-2 bg-foreground text-background rounded-full p-0.5">
                    <CheckCircle className="h-4 w-4" />
                  </div>
                )}
              </button>

              {isSelected && (
                <Textarea
                  placeholder={t("commentPlaceholder")}
                  value={comments[img.filename] ?? ""}
                  onChange={(e) =>
                    setComments((prev) => ({ ...prev, [img.filename]: e.target.value }))
                  }
                  className="text-xs h-16 resize-none"
                />
              )}

              {album.allowDownloads && isSelected && (
                <a
                  href={img.url}
                  download={img.filename}
                  className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground"
                >
                  <Download className="h-3 w-3" /> {t("download")}
                </a>
              )}
            </div>
          );
        })}
      </div>

      {album.approvalTerms && (
        <div className="mb-6 rounded-md border p-4 text-sm text-muted-foreground whitespace-pre-wrap">
          {album.approvalTerms}
        </div>
      )}

      {selectedCount > 0 && (
        <div className="flex items-start gap-3 mb-6">
          <Checkbox
            id="consent"
            checked={consentGiven}
            onCheckedChange={(v) => setConsentGiven(Boolean(v))}
          />
          <Label htmlFor="consent" className="text-sm leading-snug cursor-pointer">
            {t("consent")}
          </Label>
        </div>
      )}

      {errorMsg && (
        <Alert variant="destructive" className="mb-4">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>{t("errorTitle")}</AlertTitle>
          <AlertDescription>{errorMsg}</AlertDescription>
        </Alert>
      )}

      <Button
        size="lg"
        onClick={handleSubmit}
        disabled={!canSubmit}
        className="w-full md:w-auto"
      >
        {submitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
        {t("submit")} ({selectedCount})
      </Button>
    </div>
  );
}
