// i18n.ts
import { notFound } from 'next/navigation';
import { getRequestConfig } from 'next-intl/server';
 
// Define all supported locales
const locales = ['en', 'de'];
 
export default getRequestConfig(async ({locale}) => {
  // 1. Validate that the incoming `locale` parameter is valid
  const baseLocale = locale as string;
  if (!locales.includes(baseLocale)) {
    notFound();
  }
 
  // 2. We now know `baseLocale` is a valid string ('en' or 'de')
  // We use this validated variable for both the import and the return value.
  return {
    // HERE IS THE FIX: We return the validated `baseLocale`
    locale: baseLocale,
    messages: (await import(`./messages/${baseLocale}.json`)).default
  };
});