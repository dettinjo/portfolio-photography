// portfolio-frontend/src/lib/strapi.ts
import qs from "qs";

// --- Interfaces remain the same ---
interface StrapiImage {
  id: number;
  url: string;
  alternativeText: string | null;
  width: number;
  height: number;
  size: number | null;
}
interface StrapiResponseWrapper<T> {
  data: T;
}

export interface Album {
  id: number;
  slug: string;
  title: string;
  coverImage: StrapiImage;
  images: StrapiImage[];
  localizations?: Array<{
    id: number;
    slug: string;
    locale: string;
  }>;
  approvalRequired?: boolean;
  approvalToken?: string;
  clientName?: string;
  clientEmail?: string;
  approvalStatus?: "Pending" | "Submitted" | "Approved";
  imageApprovals?: { imageId: number; approved: boolean; comment?: string }[];
  selectionMin?: number;
  selectionMax?: number;
  allowDownloads?: boolean;
  approvalTerms?: string;
  publicationConsent?: boolean;
  testimonials?: Testimonial[];
}
export interface Testimonial {
  id: number;
  quote: string;
  name: string;
  role: string;
  avatar: StrapiImage | null;
  communication: number;
  creativity: number;
  professionalism: number;
  value: number;
}

const STRAPI_URL =
  process.env.NEXT_PUBLIC_STRAPI_API_URL || "http://localhost:1337";

export function getStrapiMedia(url: string | undefined | null): string | null {
  if (!url) {
    return null;
  }
  if (url.startsWith("http")) {
    return url;
  }
  return `${STRAPI_URL}${url}`;
}

async function fetchAPI<T>(
  path: string,
  urlParamsObject = {},
  options = {},
  locale?: string
): Promise<T> {
  try {
    const mergedOptions = {
      headers: { "Content-Type": "application/json" },
      ...options,
    };

    const paramsWithLocale = { ...urlParamsObject, locale };

    const queryString = qs.stringify(paramsWithLocale, {
      encodeValuesOnly: true,
    });
    const requestUrl = `${STRAPI_URL}/api${path}${
      queryString ? `?${queryString}` : ""
    }`;

    const response = await fetch(requestUrl, mergedOptions);
    if (!response.ok) {
      console.error(
        `Error fetching ${requestUrl}: ${response.status} ${response.statusText}`
      );
      throw new Error(`An error occurred please try again`);
    }
    const jsonData = await response.json();
    return (jsonData as StrapiResponseWrapper<T>).data || jsonData;
  } catch (error) {
    console.error(error);
    throw new Error(`An error occurred please try again`);
  }
}

export async function fetchAlbums(locale?: string): Promise<Album[]> {
  return fetchAPI<Album[]>(
    "/albums",
    { populate: { coverImage: true, images: true, localizations: true } },
    {},
    locale
  );
}

export async function fetchAllAlbumSlugs(
  locale?: string
): Promise<{ slug: string }[]> {
  const albums = await fetchAPI<{ slug: string }[]>(
    "/albums",
    { fields: ["slug"] },
    {},
    locale
  );
  return albums.map((a) => ({ slug: a.slug }));
}

export async function fetchTestimonials(
  locale?: string
): Promise<Testimonial[]> {
  return fetchAPI<Testimonial[]>(
    "/testimonials",
    { populate: { avatar: true } },
    {},
    locale
  );
}

export async function fetchAlbumBySlug(
  slug: string,
  locale?: string
): Promise<Album | null> {
  const albums = await fetchAPI<Album[]>(
    "/albums",
    {
      filters: { slug: { $eq: slug } },
      populate: {
        images: true,
        coverImage: true,
        localizations: true,
        testimonials: true,
      },
    },
    {},
    locale
  );
  return albums?.[0] || null;
}

export async function fetchAuthenticatedAPI<T>(
  path: string,
  urlParamsObject = {},
  options = {},
  token: string
): Promise<T> {
  try {
    const mergedOptions = {
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`, // Add the authorization header
      },
      ...options,
    };

    const queryString = qs.stringify(urlParamsObject, {
      encodeValuesOnly: true,
    });
    const requestUrl = `${STRAPI_URL}/api${path}${
      queryString ? `?${queryString}` : ""
    }`;

    const response = await fetch(requestUrl, mergedOptions);
    if (!response.ok) {
      console.error(
        `Error fetching ${requestUrl}: ${response.status} ${response.statusText}`
      );
      throw new Error(`An error occurred please try again`);
    }
    const jsonData = await response.json();
    // Authenticated user data often doesn't come in a `data` wrapper
    return jsonData.data || jsonData;
  } catch (error) {
    console.error(error);
    throw new Error(`An error occurred please try again`);
  }
}
