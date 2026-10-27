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

  // Remembers a language the visitor chose. Renamed from the default
  // NEXT_LOCALE: until 2026-10-27 the service worker's precache of the German
  // offline page set that cookie to "de" for every visitor.
  localeCookie: { name: "locale", sameSite: "lax", maxAge: 60 * 60 * 24 * 365 },
});

export type Locale = (typeof routing.locales)[number];

export function isValidLocale(value: string): value is Locale {
  return (routing.locales as readonly string[]).includes(value);
}
