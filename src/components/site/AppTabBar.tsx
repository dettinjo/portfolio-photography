"use client";

// Bottom navigation, only shown when the site runs as an installed app on a phone.
import { useTranslations } from "next-intl";
import { Link, usePathname } from "@/i18n/navigation";
import { cn } from "@/lib/utils";
import { NAV_ITEMS, isActive } from "./nav";

export function AppTabBar() {
  const t = useTranslations("Site.nav");
  const pathname = usePathname();
  return (
    <nav className="fixed inset-x-0 bottom-0 z-50 hidden border-t border-border/60 bg-background/90 pb-[env(safe-area-inset-bottom)] backdrop-blur standalone:block md:!hidden">
      <ul className="grid grid-cols-4">
        {NAV_ITEMS.map(({ href, key, icon: Icon }) => (
          <li key={href}>
            <Link
              href={href}
              className={cn(
                "flex flex-col items-center gap-1 py-2 font-mono text-[10px] lowercase",
                isActive(pathname, href) ? "text-rec" : "text-muted-foreground",
              )}
              aria-current={isActive(pathname, href) ? "page" : undefined}
            >
              <Icon className="h-5 w-5" />
              {t(key)}
            </Link>
          </li>
        ))}
      </ul>
    </nav>
  );
}
