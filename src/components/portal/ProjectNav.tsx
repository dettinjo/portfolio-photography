import { getTranslations } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { cn } from "@/lib/utils";

// Tabs across the project pages, styled like the site's mono readouts.
export async function ProjectNav({ slug, active, hasPreviews }: { slug: string; active: "overview" | "plan" | "selection" | "messages"; hasPreviews: boolean }) {
  const t = await getTranslations("Portal.nav");
  const tabs = [
    { key: "overview", href: `/c/${slug}` },
    { key: "plan", href: `/c/${slug}/plan` },
    ...(hasPreviews ? [{ key: "selection", href: `/c/${slug}/proofing` }] : []),
    { key: "messages", href: `/c/${slug}/messages` },
  ] as const;
  return (
    <nav className="-mx-4 mt-8 overflow-x-auto px-4 [scrollbar-width:none] sm:mx-0 sm:px-0">
      <ul className="flex gap-1.5">
        {tabs.map((tab) => (
          <li key={tab.key}>
            <Link
              href={tab.href}
              aria-current={active === tab.key ? "page" : undefined}
              className={cn(
                "readout block whitespace-nowrap border px-3 py-1.5 transition",
                active === tab.key ? "border-foreground bg-foreground text-background" : "border-border hover:border-foreground",
              )}
            >
              {t(tab.key)}
            </Link>
          </li>
        ))}
      </ul>
    </nav>
  );
}
