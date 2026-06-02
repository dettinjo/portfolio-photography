import createMiddleware from "next-intl/middleware";
import { routing } from "./i18n/routing";

export default createMiddleware(routing);

export const config = {
  // Exclude: _next, api, Payload admin, and static files
  matcher: ["/((?!_next|api|admin|.*\\..*).*)"],
};
