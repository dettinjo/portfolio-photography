"use client";

import { useLocale } from "next-intl";
import { Button } from "@/components/ui/button";
import React, { useTransition } from "react";
import { usePathname, useRouter } from "@/i18n/navigation";
import { useAlternateLinks } from "@/context/AlternateLinksProvider";

export function LanguageToggle() {
  const currentLocale = useLocale();
  const router = useRouter();
  const pathname = usePathname();
  const [isPending, startTransition] = useTransition();
  const { alternateSlugs } = useAlternateLinks();

  const nextLocale = currentLocale === "de" ? "en" : "de";

  const handleLanguageSwitch = () => {
    startTransition(() => {
      if (alternateSlugs && alternateSlugs[nextLocale]) {
        router.replace(alternateSlugs[nextLocale], { locale: nextLocale });
      } else {
        router.replace(pathname, { locale: nextLocale });
      }
    });
  };

  return (
    <Button
      variant="ghost"
      size="icon"
      onClick={handleLanguageSwitch}
      disabled={isPending}
      aria-label={`Switch language to ${nextLocale.toUpperCase()}`}
    >
      <span className="text-sm font-semibold">
        {currentLocale.toUpperCase()}
      </span>
    </Button>
  );
}
