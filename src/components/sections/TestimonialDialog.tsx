"use client";

import React from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Star } from "lucide-react";
import { Separator } from "@/components/ui/separator";
import { RatingStars } from "./RatingStars";
import { useTranslations } from "next-intl";

interface TestimonialDialogProps {
  testimonial: {
    quote: string;
    name: string;
    role: string;
    avatar: string | null;
    ratings: Record<string, number>;
  };
  children?: React.ReactNode;
  isOpen?: boolean;
  onOpenChange?: (open: boolean) => void;
}

export function TestimonialDialog({
  testimonial,
  children,
  isOpen,
  onOpenChange,
}: TestimonialDialogProps) {
  const t = useTranslations("photography.TestimonialsSection");

  const ratingValues = Object.values(testimonial.ratings);
  const averageRating =
    ratingValues.length > 0
      ? ratingValues.reduce((sum, rating) => sum + rating, 0) /
        ratingValues.length
      : 0;

  const handleOpenChange = (open: boolean) => {
    if (onOpenChange) {
      onOpenChange(open);
    }
    if (!open) {
      setTimeout(() => {
        if (document.activeElement instanceof HTMLElement) {
          document.activeElement.blur();
        }
      }, 0);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleOpenChange}>
      {children && <DialogTrigger asChild>{children}</DialogTrigger>}
      {/* --- DIALOG STYLES UPDATED --- */}
      <DialogContent
        onOpenAutoFocus={(e) => e.preventDefault()}
        className="sm:max-w-[480px] bg-foreground text-background border-transparent"
      >
        <DialogHeader>
          <DialogTitle className="text-center text-background">
            {t("dialog.title")}
          </DialogTitle>
        </DialogHeader>
        <div className="mt-4">
          <div className="flex items-center gap-4">
            <Avatar className="h-16 w-16">
              <AvatarImage
                src={testimonial.avatar || undefined}
                alt={testimonial.name}
              />
              <AvatarFallback />
            </Avatar>
            <div>
              <p className="font-semibold text-lg text-background">
                {testimonial.name}
              </p>
              <p className="text-sm text-background/80">
                {testimonial.role || t("dialog.defaultRole")}
              </p>
            </div>
          </div>
          <p className="mt-4 text-background/80 italic">
            &quot;{testimonial.quote}&quot;
          </p>
          <Separator className="my-6 bg-background/30" />
          <div className="space-y-4 text-background">
            <h3 className="font-semibold">{t("dialog.ratingsTitle")}</h3>
            {Object.entries(testimonial.ratings).map(([key, value]) => (
              <div
                key={key}
                className="flex items-center justify-between text-sm"
              >
                <span className="text-background/80">
                  {t(`dialog.ratings.${key.toLowerCase()}`)}
                </span>
                <RatingStars rating={value} />
              </div>
            ))}
          </div>
          <Separator className="my-6 bg-background/30" />
          <div className="flex items-center justify-between font-bold text-lg text-background">
            <span>{t("dialog.overallRating")}</span>
            <div className="flex items-center gap-2">
              <Star className="h-5 w-5 fill-current text-current" />
              <span>{averageRating.toFixed(1)}</span>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
