"use client";

import { useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import { Link, usePathname } from "@/i18n/navigation";
import { Sheet, SheetContent, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { LanguageToggle } from "@/components/layout/LanguageToggle";
import { ThemeToggle } from "@/components/layout/ThemeToggle";
import { cn } from "@/lib/utils";
import { NAV_ITEMS, isActive } from "./nav";
import { Wordmark } from "./Wordmark";

export function SiteHeader({ name }: { name: string }) {
  const t = useTranslations("Site.nav");
  const pathname = usePathname();
  const overHero = pathname === "/";
  // Photo pages are always dark, so the header follows
  const immersive = pathname.startsWith("/p/");
  const [scrolled, setScrolled] = useState(false);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > window.innerHeight * 0.6);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  useEffect(() => setOpen(false), [pathname]);

  const transparent = overHero && !scrolled;

  return (
    <header
      className={cn(
        "fixed inset-x-0 top-0 z-50 transition-colors duration-300",
        transparent
          ? "text-white"
          : immersive
            ? "bg-neutral-950/90 text-white backdrop-blur"
            : "bg-background/90 text-foreground backdrop-blur",
      )}
    >
      <nav className="mx-auto flex h-14 max-w-[1800px] items-center justify-between px-4 sm:px-6">
        <Link href="/" aria-label={name}>
          <Wordmark name={name} />
        </Link>

        <div className="hidden items-center gap-6 md:flex">
          {NAV_ITEMS.filter((i) => i.href !== "/").map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className="link-slide pb-0.5 text-[15px] lowercase"
              aria-current={isActive(pathname, item.href) ? "page" : undefined}
            >
              {t(item.key)}
            </Link>
          ))}
          <span className="flex items-center gap-1 font-mono text-xs">
            <LanguageToggle />
            <ThemeToggle />
          </span>
        </div>

        <Sheet open={open} onOpenChange={setOpen}>
          <SheetTrigger asChild>
            <button
              type="button"
              className="readout flex h-10 items-center md:hidden standalone:hidden"
              aria-label={t("menu")}
            >
              {t("menu")}
            </button>
          </SheetTrigger>
          <SheetContent side="right" className="flex w-full flex-col bg-background sm:max-w-sm">
            <SheetTitle className="sr-only">{name}</SheetTitle>
            <Wordmark name={name} />
            <div className="mt-16 flex flex-col">
              {NAV_ITEMS.map((item, i) => (
                <Link
                  key={item.href}
                  href={item.href}
                  className={cn(
                    "display display-xl flex items-baseline gap-3 py-2 text-6xl lowercase",
                    isActive(pathname, item.href) ? "text-foreground" : "text-muted-foreground",
                  )}
                >
                  <span className="readout w-8 text-muted-foreground">0{i + 1}</span>
                  {t(item.key)}
                </Link>
              ))}
            </div>
            <div className="mt-auto flex items-center gap-2 font-mono text-xs">
              <LanguageToggle />
              <ThemeToggle />
            </div>
          </SheetContent>
        </Sheet>
        {/* In the installed app the bottom tab bar replaces the menu */}
        <div className="hidden items-center font-mono text-xs standalone:flex md:!hidden">
          <LanguageToggle />
          <ThemeToggle />
        </div>
      </nav>
    </header>
  );
}
