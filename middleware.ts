// middleware.ts
import createMiddleware from "next-intl/middleware";
import { routing } from "./src/i18n/routing";

export default createMiddleware({
  // Use the routing config we just defined
  ...routing,

  // The default locale will be used if no other locale matches
  defaultLocale: routing.defaultLocale,
});

export const config = {
  // Match all paths except for:
  // 1. /api (API routes)
  // 2. /_next (Next.js internals)
  // 3. /_vercel (Vercel internals)
  // 4. /images (Your static images folder) <-- ADDED THIS
  // 5. /favicon.ico, .svg, .png (Static files) <-- EXPANDED THIS
  matcher: ["/((?!api|_next|_vercel|images|.*\\..*).*)"],
};
