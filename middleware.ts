import createMiddleware from "next-intl/middleware";
import { routing } from "./src/i18n/routing";

export default createMiddleware(routing);

export const config = {
  // Match all pathnames except for:
  // - _next (Next.js internals)
  // - api (API routes)
  // - static files (contain a dot)
  matcher: ["/((?!_next|api|.*\\..*).*)"],
};
