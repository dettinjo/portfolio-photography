"use client";

import { useState, useRef, useLayoutEffect } from "react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { BadgeCheck, Instagram } from "lucide-react";
import { motion } from "framer-motion";

interface ProfileHeaderProps {
  name: string;
  bio: string;
  avatarSrc: string;
}

export function ProfileHeaderSection({
  name,
  bio,
  avatarSrc,
}: ProfileHeaderProps) {
  // Ref to measure the height of the text content block
  const textContentRef = useRef<HTMLDivElement>(null);
  // State to hold the dynamic size for the avatar
  const [avatarSize, setAvatarSize] = useState(0);

  // useLayoutEffect runs synchronously after DOM mutations but before the browser paints.
  // This prevents any visual "flicker" where the avatar might briefly have a different size.
  useLayoutEffect(() => {
    const textElement = textContentRef.current;
    if (!textElement) return;

    // A ResizeObserver is the most efficient way to react to element size changes.
    const observer = new ResizeObserver((entries) => {
      // We only have one element to observe
      if (entries[0]) {
        const height = entries[0].contentRect.height;
        // Only update state if the height has actually changed to avoid unnecessary re-renders
        if (height !== avatarSize) {
          setAvatarSize(height);
        }
      }
    });

    observer.observe(textElement);

    // Cleanup observer on component unmount
    return () => observer.disconnect();
  }, [avatarSize]); // Rerun if avatarSize changes to ensure consistency

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
      // Main container using Flexbox, aligning items to the top on larger screens
      className="flex flex-col md:flex-row items-center md:items-start gap-8 md:gap-12"
    >
      {/* 1. Avatar Container */}
      <div className="flex-shrink-0">
        <Avatar
          className="border-4 border-foreground transition-all duration-300 ease-in-out"
          // Apply the dynamic height and width from state.
          // A fallback size is used for the initial render and mobile view.
          style={{
            height: avatarSize > 0 ? `${avatarSize}px` : "10rem", // 160px fallback
            width: avatarSize > 0 ? `${avatarSize}px` : "10rem",
          }}
        >
          <AvatarImage src={avatarSrc} alt={`Profile picture of ${name}`} />
          <AvatarFallback>{name.charAt(0)}</AvatarFallback>
        </Avatar>
      </div>

      {/* 2. Text Content Container with a ref attached for measurement */}
      <div
        ref={textContentRef}
        className="flex h-full flex-col text-center md:text-left"
      >
        {/* Main text content */}
        <div>
          <div className="flex items-center justify-center md:justify-start gap-2">
            <h1 className="text-3xl font-bold tracking-tight">{name}</h1>
            <BadgeCheck className="h-6 w-6 fill-foreground text-background" />
          </div>
          <p className="mt-4 max-w-xl text-muted-foreground">{bio}</p>
        </div>

        {/* Button container pushed to the bottom using flex-grow and mt-auto */}
        <div className="mt-6 flex flex-grow items-end justify-center md:justify-start pt-4">
          <Button asChild variant="secondary">
            <a
              href={`https://instagram.com/${process.env.NEXT_PUBLIC_INSTAGRAM_USERNAME}`}
              target="_blank"
              rel="noopener noreferrer"
              aria-label={`Instagram profile for @${process.env.NEXT_PUBLIC_INSTAGRAM_USERNAME}`}
            >
              <Instagram className="mr-2 h-4 w-4" />@
              {process.env.NEXT_PUBLIC_INSTAGRAM_USERNAME}
            </a>
          </Button>
        </div>
      </div>
    </motion.div>
  );
}
