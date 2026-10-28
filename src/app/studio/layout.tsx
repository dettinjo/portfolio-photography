import type { Metadata, Viewport } from "next";
import { NextIntlClientProvider } from "next-intl";
import "../globals.css";
import { mono, sans, serif } from "../fonts";
import { cn } from "@/lib/utils";
import { ThemeProvider } from "@/components/Theme-Provider";
import { StudioTabs } from "@/components/studio/StudioTabs";
import portal from "../../../messages/en/portal.json";

// The photographer's app: its own shell (no site header/footer), English,
// never indexed and never cached by the service worker.
export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: { default: "Studio", template: "%s · Studio" },
  robots: { index: false, follow: false },
  manifest: "/manifest.webmanifest",
};

export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#fafafa" },
    { media: "(prefers-color-scheme: dark)", color: "#18181b" },
  ],
};

export default function StudioLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className={cn("min-h-screen bg-background font-sans text-foreground antialiased", sans.variable, serif.variable, mono.variable)}>
        <ThemeProvider attribute="class" defaultTheme="system" enableSystem disableTransitionOnChange>
          <NextIntlClientProvider locale="en" messages={{ Portal: portal.Portal }} timeZone="Europe/Berlin">
            <div className="mx-auto max-w-2xl px-4 pb-28 pt-6 sm:px-6">{children}</div>
            <StudioTabs />
          </NextIntlClientProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
