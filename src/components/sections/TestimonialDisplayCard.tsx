// src/components/sections/photography/TestimonialDisplayCard.tsx
"use client";

import { Card, CardContent, CardFooter } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { RatingStars } from "./RatingStars";
import type { Testimonial } from "@/lib/strapi";
import { getStrapiMedia } from "@/lib/strapi";

interface TestimonialDisplayCardProps {
  testimonial: Testimonial;
}

export function TestimonialDisplayCard({
  testimonial,
}: TestimonialDisplayCardProps) {
  const ratingValues = [
    testimonial.communication,
    testimonial.creativity,
    testimonial.professionalism,
    testimonial.value,
  ].filter(Boolean); // Filter out any null/undefined ratings

  const averageRating =
    ratingValues.length > 0
      ? ratingValues.reduce((sum, rating) => sum + rating, 0) /
        ratingValues.length
      : 0;

  return (
    <Card className="relative group flex flex-col bg-foreground text-background border-transparent">
      <CardContent className="pt-6 flex-grow">
        <div className="mb-2 text-background">
          <RatingStars rating={averageRating} />
        </div>
        <p className="text-background/80 italic line-clamp-4">
          &quot;{testimonial.quote}&quot;
        </p>
      </CardContent>
      <CardFooter className="flex items-center gap-4 pb-6">
        <Avatar>
          <AvatarImage
            src={getStrapiMedia(testimonial.avatar?.url) || undefined}
            alt={testimonial.name}
          />
          <AvatarFallback>{testimonial.name.charAt(0)}</AvatarFallback>
        </Avatar>
        <div>
          <p className="font-semibold text-background">{testimonial.name}</p>
          <p className="text-sm text-background/80">{testimonial.role}</p>
        </div>
      </CardFooter>
    </Card>
  );
}
