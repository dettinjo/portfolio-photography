import createMiddleware from "next-intl/middleware";
import { routing } from "./i18n/routing";

export default createMiddleware(routing);

export const config = {
  // Exclude: _next internals, api routes, static files, and /admin (handled by next.config redirects)
  matcher: ["/((?!_next|api|admin|.*\\..*).*)"],
};
