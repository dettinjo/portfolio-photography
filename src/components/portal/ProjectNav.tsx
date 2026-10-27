import { getTranslations } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { cn } from "@/lib/utils";
import { getPayloadClient } from "@/lib/payload";
import { deliveryOpen } from "@/lib/delivery";

type Tab = "overview" | "plan" | "selection" | "photos" | "review" | "messages";

// Tabs across the project pages, styled like the site's mono readouts.
// Selection and photos appear once there is something to see.
export async function ProjectNav({ slug, projectId, active }: { slug: string; projectId: number; active: Tab }) {
  const t = await getTranslations("Portal.nav");
  const payload = await getPayloadClient();
  const [previews, project] = await Promise.all([
    payload.count({
      collection: "photos",
      where: { and: [{ project: { equals: projectId } }, { purpose: { equals: "preview" } }, { status: { equals: "ready" } }] },
      overrideAccess: true,
    }),
    payload.findByID({ collection: "projects", id: projectId, depth: 0, overrideAccess: true }),
  ]);
  const tabs: { key: Tab; href: string }[] = [
    { key: "overview", href: `/c/${slug}` },
    { key: "plan", href: `/c/${slug}/plan` },
    ...(previews.totalDocs ? [{ key: "selection" as const, href: `/c/${slug}/proofing` }] : []),
    ...(deliveryOpen(project) ? [{ key: "photos" as const, href: `/c/${slug}/photos` }] : []),
    ...(project.delivery?.deliveredAt ? [{ key: "review" as const, href: `/c/${slug}/review` }] : []),
    { key: "messages", href: `/c/${slug}/messages` },
  ];
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
