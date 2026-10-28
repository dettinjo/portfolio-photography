"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { FolderKanban, ImageUp, Inbox } from "lucide-react";
import { cn } from "@/lib/utils";

const TABS = [
  { href: "/studio", label: "Inbox", icon: Inbox, match: (p: string) => p === "/studio" },
  { href: "/studio/projects", label: "Projects", icon: FolderKanban, match: (p: string) => p.startsWith("/studio/projects") },
  { href: "/studio/upload", label: "Upload", icon: ImageUp, match: (p: string) => p.startsWith("/studio/upload") },
];

export function StudioTabs() {
  const path = usePathname() ?? "/studio";
  return (
    <nav className="fixed inset-x-0 bottom-0 z-40 border-t border-border bg-background/95 pb-[env(safe-area-inset-bottom)] backdrop-blur">
      <ul className="mx-auto grid max-w-2xl grid-cols-3">
        {TABS.map(({ href, label, icon: Icon, match }) => {
          const active = match(path);
          return (
            <li key={href}>
              <Link href={href} aria-current={active ? "page" : undefined} className={cn("flex flex-col items-center gap-1 py-3 transition", active ? "text-rec" : "text-muted-foreground hover:text-foreground")}>
                <Icon className="h-5 w-5" />
                <span className="readout">{label}</span>
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
