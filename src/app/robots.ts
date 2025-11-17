// src/app/robots.ts
import { MetadataRoute } from "next";

export default function robots(): MetadataRoute.Robots {
  const photographyDomain = process.env.NEXT_PUBLIC_PHOTOGRAPHY_DOMAIN || "";

  return {
    rules: [
      {
        userAgent: "*",
        allow: "/",
        // --- THIS IS THE FIX (PART 7) ---
        // Disallow all utility, auth, and approval paths
        disallow: [
          "/approve/",
          "/connect/",
          "/dashboard/",
          "/leave-a-review/",
          "/login/",
          "/register/",
        ],
      },
    ],
    // The sitemap is on the main domain
    sitemap: [`https://${photographyDomain}/sitemap.xml`],
  };
}
