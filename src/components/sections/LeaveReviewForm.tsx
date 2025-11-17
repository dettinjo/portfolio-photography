// src/components/sections/photography/LeaveReviewForm.tsx
"use client";

import React, { useState, useMemo, useEffect, useCallback } from "react";
import {
  GoogleReCaptchaProvider,
  useGoogleReCaptcha,
} from "react-google-recaptcha-v3";
import { useSearchParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Card,
  CardContent,
  CardTitle,
  CardDescription,
  CardFooter,
} from "@/components/ui/card";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { Star, CheckCircle2, Edit, Send } from "lucide-react";
import { Separator } from "@/components/ui/separator";
import { RatingStars } from "./RatingStars";
import { useTranslations, useLocale } from "next-intl";
import { TestimonialFormFields } from "./TestimonialFormFields";
import { cn } from "@/lib/utils";

interface PreviewTestimonial {
  name: string;
  event: string;
  quote: string;
  avatar: string | null;
  ratings: Record<string, number>;
}

type TFunction = ReturnType<typeof useTranslations>;

export const PreviewCard = ({
  testimonial,
  t,
}: {
  testimonial: PreviewTestimonial;
  t: TFunction;
}) => {
  const averageRating = useMemo(() => {
    const ratingValues = Object.values(testimonial.ratings);
    const total = ratingValues.reduce((sum, val) => sum + val, 0);
    const ratedCategories = ratingValues.filter((val) => val > 0).length;
    return ratedCategories > 0 ? total / ratedCategories : 0;
  }, [testimonial.ratings]);

  return (
    <Card className="flex flex-col">
      <CardContent className="p-6">
        <div className="flex items-center gap-4">
          <Avatar className="h-16 w-16">
            <AvatarImage
              src={testimonial.avatar || undefined}
              alt={testimonial.name}
            />
            <AvatarFallback>
              {testimonial.name
                ? testimonial.name.charAt(0).toUpperCase()
                : "?"}
            </AvatarFallback>
          </Avatar>
          <div>
            <p className="font-semibold text-lg">
              {testimonial.name || t("preview.defaultName")}
            </p>
            <p className="text-sm text-muted-foreground">
              {testimonial.event || t("preview.defaultRole")}
            </p>
          </div>
        </div>
        <p className="mt-4 text-muted-foreground italic">
          &quot;{testimonial.quote || t("preview.defaultQuote")}&quot;
        </p>
      </CardContent>
      <CardContent className="p-6 pt-0">
        <Separator className="mb-6" />
        <div className="space-y-4">
          <h3 className="font-semibold">{t("ratings.title")}</h3>
          {["communication", "creativity", "professionalism", "value"].map(
            (cat) => (
              <div
                key={cat}
                className="flex items-center justify-between text-sm"
              >
                <span className="text-muted-foreground">
                  {t(`ratings.${cat}`)}
                </span>
                <RatingStars rating={testimonial.ratings[cat] || 0} />
              </div>
            )
          )}
        </div>
      </CardContent>
      <CardFooter className="p-6 pt-0 flex-col items-start gap-6">
        <Separator />
        <div className="w-full flex items-center justify-between font-bold text-lg">
          <span>{t("preview.overallRating")}</span>
          <div className="flex items-center gap-2">
            <Star className="h-5 w-5 fill-foreground text-foreground" />
            <span>{averageRating.toFixed(1)}</span>
          </div>
        </div>
      </CardFooter>
    </Card>
  );
};

const ReviewFormContents = () => {
  const t = useTranslations("photography.LeaveReviewPage");
  const locale = useLocale();
  const { executeRecaptcha } = useGoogleReCaptcha();
  const searchParams = useSearchParams();
  const albumId = searchParams.get("albumId");
  const prefilledName = searchParams.get("clientName");
  const prefilledEvent = searchParams.get("eventName");

  const [step, setStep] = useState(1);
  const [authorName, setAuthorName] = useState(prefilledName || "");
  const [eventValue, setEventValue] = useState(prefilledEvent || "");
  const [quote, setQuote] = useState("");
  const [ratings, setRatings] = useState<Record<string, number>>({
    communication: 4,
    creativity: 4,
    professionalism: 5,
    value: 4,
  });
  const [photoFile, setPhotoFile] = useState<File | null>(null);
  const [photoPreview, setPhotoPreview] = useState<string | null>(null);
  const [submissionStatus, setSubmissionStatus] = useState("idle");

  const isFormComplete = !!quote;

  const handlePhotoChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      if (photoPreview) URL.revokeObjectURL(photoPreview);
      setPhotoFile(file);
      setPhotoPreview(URL.createObjectURL(file));
    }
  };

  useEffect(() => {
    return () => {
      if (photoPreview) URL.revokeObjectURL(photoPreview);
    };
  }, [photoPreview]);

  const handlePreview = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (isFormComplete) setStep(2);
  };

  const handleSubmit = useCallback(async () => {
    if (!executeRecaptcha) {
      setSubmissionStatus("error");
      return;
    }
    setSubmissionStatus("submitting");
    const recaptchaToken = await executeRecaptcha("testimonialSubmit");

    const finalName =
      authorName.trim() === "" ? t("form.anonymousName") : authorName.trim();

    const submissionFormData = new FormData();
    submissionFormData.append(
      "data",
      JSON.stringify({
        name: finalName,
        event: eventValue,
        quote,
        ...ratings,
        albumId: albumId ? parseInt(albumId) : null,
      })
    );

    if (photoFile) {
      submissionFormData.append("avatar", photoFile, photoFile.name);
    }

    submissionFormData.append("recaptcha", recaptchaToken);

    try {
      const response = await fetch(
        `${process.env.NEXT_PUBLIC_STRAPI_API_URL}/api/testimonials?locale=${locale}`,
        {
          method: "POST",
          body: submissionFormData,
        }
      );
      if (!response.ok) throw new Error("Submission failed");
      setStep(3);
      setSubmissionStatus("success");
    } catch (error) {
      console.error("Submission error:", error);
      setSubmissionStatus("error");
    }
  }, [
    executeRecaptcha,
    authorName,
    eventValue,
    quote,
    ratings,
    photoFile,
    locale,
    albumId,
    t,
  ]);

  if (step === 3) {
    return (
      <div className="container mx-auto max-w-2xl py-24 text-center">
        <CheckCircle2 className="h-16 w-16 text-green-500 mx-auto mb-4" />
        <h1 className="text-3xl font-bold">{t("success.title")}</h1>
        <p className="text-muted-foreground mt-2">
          {albumId ? t("success.messageAlbum") : t("success.message")}
        </p>
      </div>
    );
  }

  const previewData = {
    name:
      authorName.trim() === "" ? t("form.anonymousName") : authorName.trim(),
    event: eventValue,
    quote: quote,
    avatar: photoPreview,
    ratings: ratings,
  };

  return (
    <div className="container mx-auto max-w-2xl py-12 md:py-24">
      {step === 1 ? (
        <Card>
          <div className="p-6">
            <div className="text-center mb-6">
              <CardTitle className="text-3xl">{t("title")}</CardTitle>
              <CardDescription className="mt-1">
                {albumId ? t("subtitleAlbum") : t("subtitle")}
              </CardDescription>
            </div>
            <form onSubmit={handlePreview} className="space-y-4">
              <TestimonialFormFields
                name={authorName}
                onNameChange={setAuthorName}
                isNameDisabled={false}
                quote={quote}
                onQuoteChange={setQuote}
                ratings={ratings}
                onRatingsChange={setRatings}
                photoFile={photoFile}
                onPhotoChange={handlePhotoChange}
              />
              <div className="space-y-1.5">
                <Label htmlFor="event">{t("form.roleLabel")}</Label>
                <Input
                  id="event"
                  name="event"
                  value={eventValue}
                  onChange={(e) => setEventValue(e.target.value)}
                  placeholder={t("form.rolePlaceholder")}
                  disabled={!!prefilledEvent}
                  className={cn(
                    !!prefilledEvent && "cursor-not-allowed bg-muted/50"
                  )}
                />
              </div>
              <div className="pt-2">
                <Button
                  type="submit"
                  className="w-full"
                  disabled={!isFormComplete}
                >
                  {t("form.buttonPreview")}
                </Button>
              </div>
            </form>
          </div>
        </Card>
      ) : (
        <div>
          <div className="text-center mb-8">
            <h1 className="text-3xl font-bold">{t("preview.title")}</h1>
            <p className="text-muted-foreground">{t("preview.subtitle")}</p>
          </div>
          {/* --- DEFINITIVE FIX: Use 't' instead of 't_review' --- */}
          <PreviewCard testimonial={previewData} t={t} />
          <div className="mt-6 grid grid-cols-2 gap-4">
            <Button variant="outline" onClick={() => setStep(1)}>
              <Edit className="mr-2 h-4 w-4" /> {t("preview.buttonEdit")}
            </Button>
            <Button
              onClick={handleSubmit}
              disabled={submissionStatus === "submitting"}
            >
              {submissionStatus === "submitting" ? (
                t("preview.buttonSubmitting")
              ) : (
                <>
                  <Send className="mr-2 h-4 w-4" /> {t("preview.buttonSubmit")}
                </>
              )}
            </Button>
          </div>
          {submissionStatus === "error" && (
            <p className="text-sm text-red-500 text-center mt-4">
              {t("error")}
            </p>
          )}
        </div>
      )}
    </div>
  );
};

export function LeaveReviewForm({ siteKey }: { siteKey: string }) {
  if (!siteKey) {
    return (
      <div className="container mx-auto max-w-2xl py-24 text-center">
        <h2 className="text-2xl font-bold text-destructive">
          Configuration Error
        </h2>
        <p className="text-muted-foreground mt-2">
          The Google reCAPTCHA Site Key is missing.
        </p>
      </div>
    );
  }
  return (
    <GoogleReCaptchaProvider reCaptchaKey={siteKey}>
      <ReviewFormContents />
    </GoogleReCaptchaProvider>
  );
}
