// src/components/sections/photography/ApprovalInterface.tsx
"use client";

import { useState } from "react";
import { useRouter } from "@/i18n/navigation";
import type { Album } from "@/lib/strapi";
import { getStrapiMedia } from "@/lib/strapi";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { CheckCircle, AlertCircle, Loader2, Info } from "lucide-react";
import { SelectionImageCard } from "./SelectionImageCard";

interface ImageApprovalState {
  [imageId: number]: {
    approved: boolean;
    comment: string;
  };
}

interface ApprovalInterfaceProps {
  album: Album;
  token: string;
}

export function ApprovalInterface({ album, token }: ApprovalInterfaceProps) {
  const t = useTranslations("photography.ApprovalPage");
  const router = useRouter();

  const [approvals, setApprovals] = useState<ImageApprovalState>(() => {
    const initialState: ImageApprovalState = {};
    album.images?.forEach((img) => {
      initialState[img.id] = { approved: false, comment: "" };
    });
    return initialState;
  });
  const [consentGiven, setConsentGiven] = useState(false);
  const [submissionState, setSubmissionState] = useState<
    "idle" | "loading" | "success" | "error"
  >("idle");
  const [isDownloading, setIsDownloading] = useState(false);
  const [submissionError, setSubmissionError] = useState<string | null>(null);

  const existingTestimonial =
    album.testimonials && album.testimonials.length > 0;

  const selectedCount = Object.values(approvals).filter(
    (a) => a.approved
  ).length;

  const isSelectionCountValid = () => {
    const min = album.selectionMin || 0;
    if (min > 0 && selectedCount < min) {
      return false;
    }
    const max = album.selectionMax || Infinity;
    return selectedCount <= max;
  };

  const selectionIsValid = isSelectionCountValid();

  const isSubmitDisabled = () => {
    if (submissionState === "loading" || !selectionIsValid) return true;
    if (selectedCount > 0 && !consentGiven) return true;
    return false;
  };

  const getValidationMessage = () => {
    if (album.selectionMin && selectedCount < album.selectionMin) {
      return t("validation.min", { count: album.selectionMin });
    }
    if (album.selectionMax && selectedCount > album.selectionMax) {
      return t("validation.max", { count: album.selectionMax });
    }
    return null;
  };
  const validationMessage = getValidationMessage();

  const handleSelectionChange = (imageId: number, isSelected: boolean) => {
    setApprovals((prev) => ({
      ...prev,
      [imageId]: { ...prev[imageId], approved: isSelected },
    }));
  };

  const handleCommentChange = (imageId: number, comment: string) => {
    setApprovals((prev) => ({
      ...prev,
      [imageId]: { ...prev[imageId], comment },
    }));
  };

  const handleSelectAll = (select: boolean) => {
    const newApprovals: ImageApprovalState = {};
    Object.keys(approvals).forEach((idStr) => {
      const id = parseInt(idStr);
      newApprovals[id] = { ...approvals[id], approved: select };
    });
    setApprovals(newApprovals);
  };

  const handleSubmit = async () => {
    setSubmissionState("loading");
    setSubmissionError(null);
    const payload = {
      imageApprovals: Object.entries(approvals).map(([imageId, data]) => ({
        imageId: parseInt(imageId),
        ...data,
      })),
      consentGiven: selectedCount > 0 ? consentGiven : false,
    };

    try {
      const apiUrl = `${process.env.NEXT_PUBLIC_STRAPI_API_URL}/api/albums/submit-approval/${token}`;
      const response = await fetch(apiUrl, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        const errorBody = await response.json();
        const message =
          errorBody.error?.message || "An unknown error occurred.";
        throw new Error(message);
      }

      if (!existingTestimonial) {
        const clientName = encodeURIComponent(album.clientName || "");
        const eventName = encodeURIComponent(album.title || "");
        router.push(
          `/photography/leave-a-review?albumId=${album.id}&clientName=${clientName}&eventName=${eventName}`
        );
      } else {
        setSubmissionState("success");
      }
    } catch (error) {
      console.error("Submission error:", error);
      if (error instanceof Error) {
        setSubmissionError(error.message);
      } else {
        setSubmissionError("An unexpected error occurred.");
      }
      setSubmissionState("error");
    }
  };

  const handleDownload = async () => {
    setIsDownloading(true);
    try {
      const apiUrl = `${process.env.NEXT_PUBLIC_STRAPI_API_URL}/api/albums/download/${token}`;
      const response = await fetch(apiUrl);
      if (!response.ok) throw new Error("Failed to get download links.");

      const data = await response.json();
      const links = data.data;

      if (!Array.isArray(links) || links.length === 0)
        throw new Error("No download links found.");

      links.forEach((link: string, index: number) => {
        const fullUrl = getStrapiMedia(link);
        if (fullUrl) {
          const a = document.createElement("a");
          a.href = fullUrl;
          a.download = `${album.slug || "album"}-selection-${index + 1}.jpg`;
          document.body.appendChild(a);
          a.click();
          document.body.removeChild(a);
        }
      });
    } catch (error) {
      console.error("Download error:", error);
      alert(t("error.downloadMessage"));
    } finally {
      setIsDownloading(false);
    }
  };

  const getSubmitButtonText = () => {
    if (submissionState === "loading") {
      return t("submitButton.loading");
    }

    if (selectedCount > 0) {
      if (existingTestimonial) {
        return t("submitButton.approveOnly", { count: selectedCount });
      } else {
        return t("submitButton.approveAndReview", { count: selectedCount });
      }
    } else {
      if (existingTestimonial) {
        return t("submitButton.noApproval");
      } else {
        return t("submitButton.noApprovalAndReview");
      }
    }
  };

  if (submissionState === "success") {
    return (
      <div className="container mx-auto py-24 text-center max-w-2xl space-y-6">
        <Alert
          variant="default"
          className="bg-green-100 dark:bg-green-900/50 border-green-500"
        >
          <CheckCircle className="h-4 w-4 text-green-500" />
          <AlertTitle className="text-green-800 dark:text-green-300">
            {t("success.title")}
          </AlertTitle>
          <AlertDescription className="text-green-700 dark:text-green-400">
            {t("success.message")}
          </AlertDescription>
        </Alert>

        {album.allowDownloads && selectedCount > 0 && (
          <Button
            onClick={handleDownload}
            disabled={isDownloading}
            className="text-lg py-6"
          >
            {isDownloading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            {t("success.downloadButton", { count: selectedCount })}
          </Button>
        )}
      </div>
    );
  }

  if (!album) {
    return (
      <div className="container mx-auto py-24 text-center">
        <h1 className="text-2xl font-bold">{t("error.title")}</h1>
        <p className="text-muted-foreground">{t("error.message")}</p>
      </div>
    );
  }

  return (
    <main className="container mx-auto max-w-6xl py-12 px-4 md:py-16">
      <header className="text-center mb-12">
        <h1 className="text-4xl font-bold tracking-tight">{album.title}</h1>
        {album.clientName && (
          <p className="mt-4 text-lg text-muted-foreground">
            {t("greeting", { clientName: album.clientName })}
          </p>
        )}
      </header>

      <section className="sticky top-0 z-10 bg-background/80 backdrop-blur-sm py-4 mb-8 border-b">
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="font-semibold text-lg">
            {t("actionBar.counter", {
              selected: selectedCount,
              total: album.images?.length || 0,
            })}
          </div>
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => handleSelectAll(true)}>
              {t("actionBar.selectAll")}
            </Button>
            <Button variant="outline" onClick={() => handleSelectAll(false)}>
              {t("actionBar.deselectAll")}
            </Button>
          </div>
        </div>
        {(album.selectionMin || album.selectionMax) && (
          <div className="mt-4 text-center">
            <Alert
              variant={validationMessage ? "destructive" : "default"}
              className="max-w-md mx-auto"
            >
              {validationMessage ? (
                <AlertCircle className="h-4 w-4" />
              ) : (
                <Info className="h-4 w-4" />
              )}
              <AlertDescription>
                {validationMessage ||
                  t("validation.info", {
                    min: album.selectionMin || 0,
                    max: album.selectionMax || "any",
                  })}
              </AlertDescription>
            </Alert>
          </div>
        )}
      </section>

      <section>
        <div className="columns-2 md:columns-3 lg:columns-4 gap-4 space-y-4">
          {album.images?.map((image) => {
            const imageUrl = getStrapiMedia(image.url);
            if (!imageUrl) return null;
            return (
              <SelectionImageCard
                key={image.id}
                imageUrl={imageUrl}
                altText={image.alternativeText || `Image from ${album.title}`}
                width={image.width}
                height={image.height}
                isSelected={approvals[image.id]?.approved || false}
                comment={approvals[image.id]?.comment || ""}
                onSelectionChange={(isSelected) =>
                  handleSelectionChange(image.id, isSelected)
                }
                onCommentChange={(comment) =>
                  handleCommentChange(image.id, comment)
                }
              />
            );
          })}
        </div>
      </section>

      <section className="mt-16 max-w-3xl mx-auto space-y-8">
        {selectedCount > 0 && (
          <>
            <div>
              <h2 className="text-2xl font-semibold mb-4">
                {t("terms.title")}
              </h2>
              <div className="prose prose-sm dark:prose-invert max-w-none p-4 border rounded-lg bg-muted/30">
                <p>{t("terms.content")}</p>
              </div>
            </div>

            <div className="flex items-start space-x-3 pt-4">
              <Checkbox
                id="consent"
                checked={consentGiven}
                onCheckedChange={(checked) =>
                  setConsentGiven(checked as boolean)
                }
              />
              <div className="grid gap-1.5 leading-none">
                <Label htmlFor="consent" className="font-semibold">
                  {t("terms.consentLabel")}
                </Label>
                <p className="text-sm text-muted-foreground">
                  {t("terms.consentDescription")}
                </p>
              </div>
            </div>
          </>
        )}

        {submissionState === "error" && (
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertTitle>{t("error.submitTitle")}</AlertTitle>
            <AlertDescription>
              {submissionError || t("error.submitMessage")}
            </AlertDescription>
          </Alert>
        )}

        <Button
          onClick={handleSubmit}
          disabled={isSubmitDisabled()}
          className="w-full text-lg py-6"
        >
          {submissionState === "loading" ? (
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          ) : null}
          <span>{getSubmitButtonText()}</span>
        </Button>
      </section>
    </main>
  );
}
