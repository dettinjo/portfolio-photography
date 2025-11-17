// middleware.ts

// --- THIS IS THE FIX (PART 2) ---
// This entire file is replaced with the standard next-intl middleware.
// It will automatically read your 'routing.ts' config and handle
// path-based locale detection and redirection.

import createMiddleware from "next-intl/middleware";
import { routing } from "./src/i18n/routing";

export default createMiddleware({
  // Use the routing config we just defined
  ...routing,

  // The default locale will be used if no other locale matches
  defaultLocale: routing.defaultLocale,
});

export const config = {
  // Match all paths except for static assets and API routes
  matcher: ["/((?!api|_next/static|_next/image|favicon).*)"],
};
