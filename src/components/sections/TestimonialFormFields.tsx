// src/components/sections/photography/TestimonialFormFields.tsx
"use client";

import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Slider } from "@/components/ui/slider";
import { buttonVariants } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { RatingStars } from "./RatingStars";
import { useTranslations } from "next-intl";
import { cn } from "@/lib/utils";

const ratingCategories = [
  { id: "communication" },
  { id: "creativity" },
  { id: "professionalism" },
  { id: "value" },
];

interface TestimonialFormFieldsProps {
  name: string;
  onNameChange: (name: string) => void;
  quote: string;
  onQuoteChange: (quote: string) => void;
  ratings: Record<string, number>;
  onRatingsChange: (ratings: Record<string, number>) => void;
  photoFile: File | null;
  onPhotoChange: (event: React.ChangeEvent<HTMLInputElement>) => void;
  isNameDisabled?: boolean;
}

export function TestimonialFormFields({
  name,
  onNameChange,
  quote,
  onQuoteChange,
  ratings,
  onRatingsChange,
  photoFile,
  onPhotoChange,
  isNameDisabled = false,
}: TestimonialFormFieldsProps) {
  const t = useTranslations("photography.LeaveReviewPage");

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="space-y-1.5">
          <Label htmlFor="name">{t("form.nameLabel")}</Label>
          <Input
            id="name"
            name="name"
            value={name}
            onChange={(e) => onNameChange(e.target.value)}
            placeholder={t("form.namePlaceholderOptional")}
            disabled={isNameDisabled}
            className={cn(isNameDisabled && "cursor-not-allowed bg-muted/50")}
          />
        </div>
        <div className="space-y-1.5">
          <Label>{t("form.photoLabel")}</Label>
          <div className="flex items-center gap-4">
            <Input
              id="photo"
              name="photo"
              type="file"
              accept="image/png, image/jpeg, image/webp"
              onChange={onPhotoChange}
              className="sr-only"
            />
            <Label
              htmlFor="photo"
              className={cn(
                buttonVariants({ variant: "outline" }),
                "cursor-pointer"
              )}
            >
              {t("form.buttonUpload")}
            </Label>
            <span className="text-sm text-muted-foreground truncate">
              {photoFile ? photoFile.name : t("form.noFileChosen")}
            </span>
          </div>
        </div>
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="message">{t("form.testimonialLabel")}</Label>
        <Textarea
          id="message"
          name="message"
          value={quote}
          onChange={(e) => onQuoteChange(e.target.value)}
          placeholder={t("form.testimonialPlaceholder")}
          className="min-h-[100px]"
          required
        />
      </div>

      <Separator />

      <div>
        <h3 className="text-lg font-semibold mb-4">{t("ratings.title")}</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-4">
          {ratingCategories.map((cat) => (
            <div key={cat.id} className="space-y-2">
              <div className="flex justify-between items-center text-sm">
                <Label htmlFor={cat.id}>{t(`ratings.${cat.id}`)}</Label>
                <RatingStars rating={ratings[cat.id]} />
              </div>
              <Slider
                id={cat.id}
                value={[ratings[cat.id]]}
                onValueChange={([val]) =>
                  onRatingsChange({ ...ratings, [cat.id]: val })
                }
                min={1}
                max={5}
                step={1}
              />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
