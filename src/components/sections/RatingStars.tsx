"use client";

import { Star, StarHalf } from "lucide-react";

interface RatingStarsProps {
  rating: number;
  max?: number;
}

export function RatingStars({ rating, max = 5 }: RatingStarsProps) {
  const roundedRating = Math.round(rating * 2) / 2;

  return (
    <div className="flex items-center">
      {Array.from({ length: max }).map((_, index) => {
        const starValue = index + 1;

        // Condition for a full star
        if (roundedRating >= starValue) {
          return (
            <Star key={index} className="h-5 w-5 fill-current text-current" />
          );
        }

        // Condition for a half star
        if (roundedRating === starValue - 0.5) {
          return (
            <div key={index} className="relative h-5 w-5">
              {/* The empty star is the bottom layer, semi-transparent */}
              <Star className="absolute top-0 left-0 h-5 w-5 fill-current/30 text-current/30" />
              {/* The half-filled star is the top layer, fully opaque */}
              <StarHalf className="absolute top-0 left-0 h-5 w-5 fill-current text-current" />
            </div>
          );
        }

        // Otherwise, it's an empty star, semi-transparent
        return (
          <Star
            key={index}
            className="h-5 w-5 fill-current/30 text-current/30"
          />
        );
      })}
    </div>
  );
}
