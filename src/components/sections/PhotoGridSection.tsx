"use client";

import Image from "next/image";
import { GalleryLightbox } from "@/components/GalleryLightbox";
import { Button } from "@/components/ui/button";
import { ArrowUp, Images } from "lucide-react";
import { useTranslations } from "next-intl"; // 1. Import translation hook
import { motion } from "framer-motion"; // 2. Import motion for animations

interface Album {
  id: number;
  slug: string;
  title: string;
  coverImageUrl: string;
  images: string[];
}

interface PhotoGridSectionProps {
  albums: Album[];
}

export function PhotoGridSection({ albums }: PhotoGridSectionProps) {
  const t = useTranslations("photography.PhotoGridSection"); // 3. Initialize translations

  const handleScrollToTop = () => {
    window.scrollTo({
      top: 0,
      behavior: "smooth",
    });
  };

  return (
    <section>
      {/* 4. Main animation container */}
      <motion.div
        initial="hidden"
        whileInView="visible"
        viewport={{ once: true, amount: 0.1 }}
        variants={{
          visible: { transition: { staggerChildren: 0.1 } }, // Stagger children animation
        }}
        className="grid grid-cols-2 md:grid-cols-3 gap-0"
      >
        {albums.map((album, albumIndex) => (
          // 5. Each grid item has its own animation variant
          <motion.div
            key={album.id}
            variants={{
              hidden: { opacity: 0, y: 20 },
              visible: { opacity: 1, y: 0, transition: { duration: 0.5 } },
            }}
          >
            <GalleryLightbox
              allAlbums={albums}
              startAlbumIndex={albumIndex}
              startPhotoIndex={0}
            >
              <div className="group relative block aspect-[4/5] cursor-pointer overflow-hidden focus-visible:outline-none">
                <Image
                  src={album.coverImageUrl}
                  alt={`Cover image for ${album.title}`}
                  fill
                  sizes="(max-width: 768px) 50vw, 33vw"
                  className="object-cover transition-transform duration-300"
                  priority={albumIndex < 6}
                />
                <div className="absolute inset-0 bg-black/60 flex flex-col items-center justify-center p-4 opacity-0 transition-opacity duration-300 group-hover:opacity-100">
                  <h3 className="text-center text-lg font-semibold text-white">
                    {album.title}
                  </h3>
                  <div className="flex items-center gap-1.5 mt-2 text-sm text-white/80">
                    <Images className="h-4 w-4" />
                    {/* 6. Use translations for "Photo" / "Photos" */}
                    <span>
                      {album.images.length}{" "}
                      {album.images.length > 1 ? t("photos") : t("photo")}
                    </span>
                  </div>
                </div>
              </div>
            </GalleryLightbox>
          </motion.div>
        ))}
      </motion.div>

      <div className="mt-12 flex justify-center">
        <Button variant="secondary" onClick={handleScrollToTop}>
          <ArrowUp className="mr-2 h-4 w-4" />
          {/* 7. Use translation for the button text */}
          {t("backToTop")}
        </Button>
      </div>
    </section>
  );
}
