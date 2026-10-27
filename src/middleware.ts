import createMiddleware from "next-intl/middleware";
import { routing } from "./i18n/routing";

export default createMiddleware(routing);

export const config = {
  // Exclude: _next, api, Payload admin, static files, and the offline pages the
  // service worker precaches (fetching them must not set the language cookie).
  matcher: ["/((?!_next|api|admin|en/offline|de/offline|.*\\..*).*)"],
};
