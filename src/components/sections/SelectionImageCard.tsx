// src/components/sections/photography/SelectionImageCard.tsx
"use client";

import { useState } from "react";
import Image from "next/image";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";
import { useTranslations } from "next-intl";
import { Check, MessageSquare } from "lucide-react";

interface SelectionImageCardProps {
  imageUrl: string;
  altText: string;
  width: number;
  height: number;
  isSelected: boolean;
  comment: string;
  onSelectionChange: (isSelected: boolean) => void;
  onCommentChange: (comment: string) => void;
}

export function SelectionImageCard({
  imageUrl,
  altText,
  width,
  height,
  isSelected,
  comment,
  onSelectionChange,
  onCommentChange,
}: SelectionImageCardProps) {
  const t = useTranslations("photography.ApprovalPage.imageCard");
  const [localComment, setLocalComment] = useState(comment);
  const [isPopoverOpen, setIsPopoverOpen] = useState(false);

  const handleSaveComment = () => {
    onCommentChange(localComment);
    setIsPopoverOpen(false); // Close popover on save
  };

  return (
    <div className="break-inside-avoid group relative">
      <div
        className={cn(
          "relative block rounded-lg overflow-hidden border-4 transition-colors duration-200 cursor-pointer",
          isSelected
            ? "border-green-500"
            : "border-transparent hover:border-muted/50"
        )}
        onClick={() => onSelectionChange(!isSelected)}
      >
        <Image
          src={imageUrl}
          alt={altText}
          width={width}
          height={height}
          className="w-full h-auto block"
          sizes="(max-width: 768px) 50vw, (max-width: 1200px) 33vw, 25vw"
        />
        {/* Checkmark overlay for selected images */}
        {isSelected && (
          <div className="absolute inset-0 flex items-center justify-center bg-black/30">
            <Check className="h-16 w-16 text-white" />
          </div>
        )}
      </div>

      {/* Comment Popover Trigger */}
      <div className="absolute top-2 right-2">
        <Popover open={isPopoverOpen} onOpenChange={setIsPopoverOpen}>
          <PopoverTrigger asChild>
            <Button
              variant="ghost"
              size="icon"
              className={cn(
                "h-8 w-8 rounded-full bg-black/50 text-white backdrop-blur-sm hover:bg-white hover:text-black",
                comment && "bg-primary text-white" // Highlight if comment exists
              )}
              aria-label={t("commentAriaLabel")}
              onClick={(e) => e.stopPropagation()} // Prevent image from being toggled
            >
              <MessageSquare className="h-4 w-4" />
            </Button>
          </PopoverTrigger>
          <PopoverContent
            className="w-64"
            align="end"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="grid gap-4">
              <div className="space-y-1">
                <h4 className="font-medium leading-none">
                  {t("commentTitle")}
                </h4>
                <p className="text-sm text-muted-foreground">
                  {t("commentDescription")}
                </p>
              </div>
              <div className="grid gap-2">
                <Textarea
                  placeholder={t("commentPlaceholder")}
                  value={localComment}
                  onChange={(e) => setLocalComment(e.target.value)}
                />
                <Button onClick={handleSaveComment}>
                  {t("commentSaveButton")}
                </Button>
              </div>
            </div>
          </PopoverContent>
        </Popover>
      </div>
    </div>
  );
}
