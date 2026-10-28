"use client";

// "Plan your shoot": four short steps that end in a stored inquiry.
import { useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import { cn } from "@/lib/utils";
import { AvailabilityCalendar } from "@/components/site/AvailabilityCalendar";

interface PlannerOffering {
  id: number;
  slug: string;
  title: string;
}

interface ShootPlannerProps {
  offerings: PlannerOffering[];
  initialOffering?: string;
  photoId?: number;
}

const SIZES = ["small", "medium", "large"] as const;
const BUDGETS = ["lt200", "200-500", "500-1000", "gt1000", "unsure"] as const;
const STEPS = 4;

export function ShootPlanner({ offerings, initialOffering, photoId }: ShootPlannerProps) {
  const t = useTranslations("Site.sessions.planner");
  const locale = useLocale();
  const [step, setStep] = useState(0);
  const [what, setWhat] = useState<string | null>(
    offerings.some((o) => o.slug === initialOffering) ? initialOffering! : null,
  );
  const [kind, setKind] = useState("");
  const [date, setDate] = useState("");
  const [flexible, setFlexible] = useState(false);
  const [location, setLocation] = useState("");
  const [size, setSize] = useState<string | null>(null);
  const [budget, setBudget] = useState<string | null>(null);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [message, setMessage] = useState("");
  const [website, setWebsite] = useState(""); // honeypot
  const [status, setStatus] = useState<"idle" | "sending" | "done" | "error">("idle");
  const [hint, setHint] = useState(false);

  const complete = [
    what !== null && (what !== "other" || kind.trim().length > 1),
    true,
    true,
    name.trim().length > 0 && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email),
  ];

  const next = () => {
    if (!complete[step]) return setHint(true);
    setHint(false);
    setStep((s) => Math.min(s + 1, STEPS - 1));
  };

  const submit = async () => {
    if (!complete.every(Boolean)) return setHint(true);
    setStatus("sending");
    const offering = offerings.find((o) => o.slug === what);
    try {
      const res = await fetch("/api/inquiry-submissions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          locale,
          offering: offering?.id,
          kind: offering ? undefined : kind,
          date: date || undefined,
          dateFlexible: flexible,
          location,
          size,
          budget,
          name,
          email,
          phone,
          message,
          photo: photoId,
          website,
        }),
      });
      setStatus(res.ok ? "done" : "error");
    } catch {
      setStatus("error");
    }
  };

  if (status === "done") {
    return (
      <div className="py-10">
        <p className="display display-xl text-8xl lowercase text-rec sm:text-9xl">{t("successTitle")}</p>
        <p className="mt-6 max-w-lg text-lg">{t("successText", { name: name.split(" ")[0] })}</p>
      </div>
    );
  }

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        if (step < STEPS - 1) next();
        else submit();
      }}
      className="relative"
      noValidate
    >
      <input
        type="text"
        name="website"
        value={website}
        onChange={(e) => setWebsite(e.target.value)}
        tabIndex={-1}
        autoComplete="off"
        aria-hidden="true"
        className="absolute -left-[9999px] h-0 w-0 opacity-0"
      />

      <div className="readout flex items-center justify-between text-muted-foreground">
        <span>{t("step", { n: step + 1, total: STEPS })}</span>
        {photoId && <span>{t("fromPhoto", { id: photoId })}</span>}
      </div>
      <div className="mt-3 grid grid-cols-4 gap-1" aria-hidden>
        {Array.from({ length: STEPS }, (_, i) => (
          <span key={i} className={cn("h-1 transition-colors duration-300", i <= step ? "bg-rec" : "bg-border")} />
        ))}
      </div>

      <fieldset className="mt-10 min-h-[22rem]">
        {step === 0 && (
          <>
            <legend className="display text-4xl sm:text-5xl">{t("what")}</legend>
            <div className="mt-8 grid gap-2">
              {[...offerings.map((o) => ({ value: o.slug, label: o.title })), { value: "other", label: t("somethingElse") }].map(
                (o, i) => (
                  <Choice key={o.value} index={i} checked={what === o.value} onSelect={() => setWhat(o.value)} name="what">
                    {o.label}
                  </Choice>
                ),
              )}
            </div>
            {what === "other" && (
              <input
                autoFocus
                value={kind}
                onChange={(e) => setKind(e.target.value)}
                placeholder={t("somethingElsePlaceholder")}
                className="mt-4 w-full border-b border-foreground bg-transparent py-3 text-xl outline-none placeholder:text-muted-foreground focus:border-rec"
              />
            )}
          </>
        )}

        {step === 1 && (
          <>
            <legend className="display text-4xl sm:text-5xl">{t("when")}</legend>
            <div className="mt-8 grid gap-8 sm:grid-cols-2">
              <Field label={t("date")} htmlFor="plan-date">
                <AvailabilityCalendar value={date} onChange={setDate} />
                <label className="mt-4 flex cursor-pointer items-center gap-3">
                  <input
                    type="checkbox"
                    checked={flexible}
                    onChange={(e) => setFlexible(e.target.checked)}
                    className="h-4 w-4 accent-[hsl(var(--rec))]"
                  />
                  {t("flexible")}
                </label>
              </Field>
              <Field label={t("location")} htmlFor="plan-location">
                <input
                  id="plan-location"
                  value={location}
                  onChange={(e) => setLocation(e.target.value)}
                  placeholder={t("locationPlaceholder")}
                  className="w-full border-b border-foreground bg-transparent py-3 text-xl outline-none placeholder:text-muted-foreground focus:border-rec"
                />
              </Field>
            </div>
          </>
        )}

        {step === 2 && (
          <>
            <legend className="display text-4xl sm:text-5xl">{t("size")}</legend>
            <div className="mt-8 grid gap-2">
              {SIZES.map((s, i) => (
                <Choice key={s} index={i} checked={size === s} onSelect={() => setSize(s)} name="size" small>
                  {t(`sizes.${s}`)}
                </Choice>
              ))}
            </div>
            <p className="readout mt-10 text-muted-foreground">{t("budget")}</p>
            <div className="mt-3 flex flex-wrap gap-2">
              {BUDGETS.map((b) => (
                <button
                  key={b}
                  type="button"
                  aria-pressed={budget === b}
                  onClick={() => setBudget(b)}
                  className={cn(
                    "border px-4 py-2 transition-colors",
                    budget === b ? "border-foreground bg-foreground text-background" : "border-border hover:border-foreground",
                  )}
                >
                  {t(`budgets.${b}`)}
                </button>
              ))}
            </div>
          </>
        )}

        {step === 3 && (
          <>
            <legend className="display text-4xl sm:text-5xl">{t("you")}</legend>
            <div className="mt-8 grid gap-8 sm:grid-cols-2">
              <Field label={t("name")} htmlFor="plan-name">
                <input
                  required
                  id="plan-name"
                  autoComplete="name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full border-b border-foreground bg-transparent py-3 text-xl outline-none focus:border-rec"
                />
              </Field>
              <Field label={t("email")} htmlFor="plan-email">
                <input
                  required
                  type="email"
                  id="plan-email"
                  autoComplete="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full border-b border-foreground bg-transparent py-3 text-xl outline-none focus:border-rec"
                />
              </Field>
              <Field label={t("phone")} htmlFor="plan-phone">
                <input
                  type="tel"
                  id="plan-phone"
                  autoComplete="tel"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  className="w-full border-b border-foreground bg-transparent py-3 text-xl outline-none focus:border-rec"
                />
              </Field>
              <Field label={t("message")} htmlFor="plan-message" className="sm:col-span-2">
                <textarea
                  id="plan-message"
                  rows={3}
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  placeholder={t("messagePlaceholder")}
                  className="w-full resize-none border-b border-foreground bg-transparent py-3 text-lg outline-none placeholder:text-muted-foreground focus:border-rec"
                />
              </Field>
            </div>
            <p className="mt-6 text-sm text-muted-foreground">{t("privacy")}</p>
          </>
        )}
      </fieldset>

      {hint && !complete[step] && (
        <p role="alert" className="readout mt-4 text-rec">
          {t("required")}
        </p>
      )}
      {status === "error" && (
        <p role="alert" className="mt-4 text-destructive">
          {t("error")}
        </p>
      )}

      <div className="mt-8 flex items-center justify-between gap-4">
        <button
          type="button"
          onClick={() => setStep((s) => Math.max(0, s - 1))}
          className={cn("readout py-3", step === 0 && "invisible")}
        >
          ← {t("back")}
        </button>
        <button
          type="submit"
          disabled={status === "sending"}
          className="bg-foreground px-7 py-3.5 text-background transition hover:bg-rec hover:text-white disabled:opacity-60"
        >
          {step < STEPS - 1 ? `${t("next")} →` : status === "sending" ? t("sending") : `${t("send")} →`}
        </button>
      </div>
    </form>
  );
}

function Choice({
  index,
  checked,
  onSelect,
  name,
  small,
  children,
}: {
  index: number;
  checked: boolean;
  onSelect: () => void;
  name: string;
  small?: boolean;
  children: React.ReactNode;
}) {
  return (
    <label
      className={cn(
        "group flex cursor-pointer items-center gap-4 border px-4 py-4 transition-colors",
        checked ? "border-foreground" : "border-border hover:border-foreground",
      )}
    >
      <input type="radio" name={name} checked={checked} onChange={onSelect} className="sr-only" />
      <span className="readout w-6 text-muted-foreground">{String.fromCharCode(65 + index)}</span>
      <span className={cn(small ? "text-lg" : "display text-3xl sm:text-4xl", "flex-1")}>{children}</span>
      <span
        aria-hidden
        className={cn("h-3 w-3 rounded-full border transition-colors", checked ? "border-rec bg-rec" : "border-current opacity-30")}
      />
    </label>
  );
}

function Field({
  label,
  htmlFor,
  children,
  className,
}: {
  label: string;
  htmlFor: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={className}>
      <label htmlFor={htmlFor} className="readout text-muted-foreground">
        {label}
      </label>
      {children}
    </div>
  );
}
