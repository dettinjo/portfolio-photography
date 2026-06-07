"use client";

import { useState, useEffect, useCallback } from "react";
import {
  Dialog,
  DialogContent,
  DialogTrigger,
  DialogTitle,
  DialogClose,
} from "@/components/ui/dialog";
import { VisuallyHidden } from "@/components/ui/visually-hidden";
import Image from "next/image";
import { Button } from "@/components/ui/button";
import { ArrowLeft, ArrowRight, X } from "lucide-react";
import { useTranslations } from "next-intl"; // Import the hook

interface Album {
  images: string[];
  title: string;
}

interface GalleryLightboxProps {
  allAlbums: Album[];
  startAlbumIndex?: number;
  startPhotoIndex?: number;
  children: React.ReactNode;
}

export function GalleryLightbox({
  allAlbums,
  startAlbumIndex = 0,
  startPhotoIndex = 0,
  children,
}: GalleryLightboxProps) {
  // --- DEFINITIVE FIX: Use the common namespace ---
  const t = useTranslations("GalleryLightbox");

  const [currentAlbumIndex, setCurrentAlbumIndex] = useState(startAlbumIndex);
  const [currentPhotoIndex, setCurrentPhotoIndex] = useState(startPhotoIndex);
  const [isOpen, setIsOpen] = useState(false);

  const currentAlbum = allAlbums[currentAlbumIndex];
  const currentImage = currentAlbum.images[currentPhotoIndex];

  const goToNext = useCallback(() => {
    const isLastPhotoInAlbum =
      currentPhotoIndex >= currentAlbum.images.length - 1;
    const isLastAlbum = currentAlbumIndex >= allAlbums.length - 1;

    if (!isLastPhotoInAlbum) {
      setCurrentPhotoIndex((prev) => prev + 1);
    } else if (!isLastAlbum) {
      setCurrentAlbumIndex((prev) => prev + 1);
      setCurrentPhotoIndex(0);
    } else {
      setCurrentAlbumIndex(0);
      setCurrentPhotoIndex(0);
    }
  }, [
    currentAlbumIndex,
    currentPhotoIndex,
    allAlbums,
    currentAlbum.images.length,
  ]);

  const goToPrevious = useCallback(() => {
    const isFirstPhotoInAlbum = currentPhotoIndex === 0;
    const isFirstAlbum = currentAlbumIndex === 0;

    if (!isFirstPhotoInAlbum) {
      setCurrentPhotoIndex((prev) => prev - 1);
    } else if (!isFirstAlbum) {
      const prevAlbumIndex = currentAlbumIndex - 1;
      const prevAlbum = allAlbums[prevAlbumIndex];
      setCurrentAlbumIndex(prevAlbumIndex);
      setCurrentPhotoIndex(prevAlbum.images.length - 1);
    } else {
      const lastAlbumIndex = allAlbums.length - 1;
      const lastAlbum = allAlbums[lastAlbumIndex];
      setCurrentAlbumIndex(lastAlbumIndex);
      setCurrentPhotoIndex(lastAlbum.images.length - 1);
    }
  }, [currentAlbumIndex, currentPhotoIndex, allAlbums]);

  useEffect(() => {
    if (isOpen) {
      const handleKeyDown = (event: KeyboardEvent) => {
        if (event.key === "ArrowRight") goToNext();
        if (event.key === "ArrowLeft") goToPrevious();
      };
      window.addEventListener("keydown", handleKeyDown);
      return () => window.removeEventListener("keydown", handleKeyDown);
    }
  }, [isOpen, goToNext, goToPrevious]);

  const stopPropagation = (e: React.MouseEvent) => e.stopPropagation();

  return (
    <Dialog
      open={isOpen}
      onOpenChange={(open) => {
        setIsOpen(open);
        if (open) {
          setCurrentAlbumIndex(startAlbumIndex);
          setCurrentPhotoIndex(startPhotoIndex);
        } else {
          setTimeout(() => {
            if (document.activeElement instanceof HTMLElement) {
              document.activeElement.blur();
            }
          }, 0);
        }
      }}
    >
      <DialogTrigger asChild>{children}</DialogTrigger>
      <DialogContent
        onOpenAutoFocus={(e) => e.preventDefault()}
        onCloseAutoFocus={(e) => e.preventDefault()}
        className="bg-black/80 backdrop-blur-sm border-none shadow-none w-screen h-screen max-w-full p-0 flex items-center justify-center"
      >
        <VisuallyHidden asChild>
          <DialogTitle>
            {t("dialogTitle", {
              prefix: currentAlbum.title,
              index: currentPhotoIndex + 1,
            })}
          </DialogTitle>
        </VisuallyHidden>

        <Button
          variant="ghost"
          size="icon"
          onClick={(e) => {
            stopPropagation(e);
            goToPrevious();
          }}
          className="absolute left-2 md:left-4 top-1/2 -translate-y-1/2 z-50 text-white hover:bg-white/20 hover:text-white h-12 w-12 rounded-full"
          aria-label={t("previousImage")}
        >
          <ArrowLeft className="h-8 w-8" />
        </Button>

        <div className="relative w-full h-full max-w-[90vw] max-h-[85vh]">
          <Image
            src={currentImage}
            alt={t("imageAlt", {
              prefix: currentAlbum.title,
              index: currentPhotoIndex + 1,
            })}
            fill
            sizes="100vw"
            className="object-contain"
            key={currentImage}
            unoptimized
          />
        </div>

        {/* Pre-load next and previous images to make sliding instantaneous */}
        {currentPhotoIndex < currentAlbum.images.length - 1 && (
          <Image
            src={currentAlbum.images[currentPhotoIndex + 1]}
            alt=""
            width={1}
            height={1}
            className="hidden"
            unoptimized
          />
        )}
        {currentPhotoIndex > 0 && (
          <Image
            src={currentAlbum.images[currentPhotoIndex - 1]}
            alt=""
            width={1}
            height={1}
            className="hidden"
            unoptimized
          />
        )}

        <Button
          variant="ghost"
          size="icon"
          onClick={(e) => {
            stopPropagation(e);
            goToNext();
          }}
          className="absolute right-2 md:right-4 top-1/2 -translate-y-1/2 z-50 text-white hover:bg-white/20 hover:text-white h-12 w-12 rounded-full"
          aria-label={t("nextImage")}
        >
          <ArrowRight className="h-8 w-8" />
        </Button>

        <div className="absolute bottom-4 left-1/2 -translate-x-1/2 z-50 rounded-full bg-black/50 text-white text-sm px-3 py-1.5 pointer-events-none text-center">
          <div className="font-semibold">{currentAlbum.title}</div>
          <div className="text-xs opacity-80">
            {currentPhotoIndex + 1} / {currentAlbum.images.length}
          </div>
        </div>

        <DialogClose asChild>
          <Button
            variant="ghost"
            size="icon"
            aria-label={t("close")}
            onClick={stopPropagation}
            className="absolute top-2 right-2 md:top-4 md:right-4 z-50 text-white hover:bg-white/20 hover:text-white h-12 w-12 rounded-full"
          >
            <X className="h-8 w-8" />
          </Button>
        </DialogClose>
      </DialogContent>
    </Dialog>
  );
}
