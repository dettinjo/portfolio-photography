// src/i18n/routing.ts
import { defineRouting } from "next-intl/routing";

export const routing = defineRouting({
  locales: ["en", "de"] as const,
  defaultLocale: "en",

  // --- THIS IS THE FIX (PART 1) ---
  // Change 'never' to 'as-needed'.
  // This will show the prefix for 'de' (e.g., /de/slug)
  // but not for the default 'en' (e.g., /slug).
  localePrefix: "as-needed",
});

export type Locale = (typeof routing.locales)[number];

export function isValidLocale(value: string): value is Locale {
  return (routing.locales as readonly string[]).includes(value);
}
