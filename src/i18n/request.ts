import { getRequestConfig } from "next-intl/server";
import { isValidLocale, routing } from "./routing";

export default getRequestConfig(async ({ requestLocale }) => {
  // requestLocale is provided by next-intl from the [locale] route segment.
  // Fall back to the default locale if the segment is missing or invalid.
  let locale = await requestLocale;
  if (!locale || !isValidLocale(locale)) {
    locale = routing.defaultLocale;
  }

  return {
    locale,
    messages: {
      ...(await import(`../../messages/${locale}/common.json`)).default,
      photography: (await import(`../../messages/${locale}/photography.json`))
        .default,
    },
  };
});
