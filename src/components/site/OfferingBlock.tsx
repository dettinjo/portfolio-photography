import { getTranslations } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { formatPrice, type SessionOffering } from "@/lib/sessions";
import type { Locale } from "@/lib/portfolio";
import { JustifiedGrid } from "./JustifiedGrid";

export async function OfferingBlock({
  offering,
  index,
  locale,
}: {
  offering: SessionOffering;
  index: number;
  locale: Locale;
}) {
  const t = await getTranslations("Site.sessions");
  const prefix = locale === "de" ? "/de" : "";
  const facts: [string, string | null][] = [
    [t("facts.duration"), offering.duration],
    [t("facts.delivery"), offering.deliveryDays ? t("facts.deliveryDays", { count: offering.deliveryDays }) : null],
    [t("facts.revisions"), offering.revisionRounds ? String(offering.revisionRounds) : null],
    [t("facts.deposit"), offering.depositPercent ? `${offering.depositPercent} %` : null],
    [t("facts.extra"), offering.extraImagePrice ? formatPrice(offering.extraImagePrice, locale) : null],
  ];

  return (
    <article id={offering.slug} className="grid scroll-mt-20 gap-10 md:grid-cols-2 md:gap-16">
      <div className={index % 2 ? "md:order-2" : undefined}>
        <JustifiedGrid photos={offering.photos} hrefPrefix={`${prefix}/p/`} className="[--row-h:220px] lg:[--row-h:260px]" />
      </div>
      <div>
        <p className="readout text-muted-foreground">
          ({String.fromCharCode(65 + index)}) <span className="text-rec">●</span> {offering.title}
        </p>
        <h2 className="display display-xl mt-4 text-6xl lowercase sm:text-7xl">{offering.title}</h2>
        {offering.tagline && <p className="mt-3 text-lg text-muted-foreground">{offering.tagline}</p>}

        <p className="readout mt-8 text-muted-foreground">{t("included")}</p>
        <ul className="mt-3 space-y-2">
          {offering.includes.map((line) => (
            <li key={line} className="flex gap-3 text-lg">
              <span className="font-mono text-rec">+</span>
              {line}
            </li>
          ))}
        </ul>

        <dl className="mt-8 grid grid-cols-2 gap-x-6 gap-y-4 border-t border-border pt-6 sm:grid-cols-3">
          {facts
            .filter(([, v]) => v)
            .map(([k, v]) => (
              <div key={k}>
                <dt className="readout text-muted-foreground">{k}</dt>
                <dd className="mt-1 font-mono text-sm">{v}</dd>
              </div>
            ))}
        </dl>

        <div className="mt-8 flex flex-wrap items-center justify-between gap-6">
          <p className="accent-serif text-4xl">
            {offering.fromPrice ? t("from", { price: formatPrice(offering.fromPrice, locale) }) : t("onRequest")}
          </p>
          <Link
            href={`/sessions?offering=${offering.slug}#plan`}
            scroll={false}
            className="bg-foreground px-6 py-3 text-background transition hover:bg-rec hover:text-white"
          >
            {t("plan")} →
          </Link>
        </div>
      </div>
    </article>
  );
}
