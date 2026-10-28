import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  const firstName = (process.env.NEXT_PUBLIC_FULL_NAME || "Photographer").split(" ")[0];
  return {
    id: "/",
    name: `Photos by ${firstName}`,
    short_name: `Photos by ${firstName}`,
    description: "Photography portfolio, client galleries and bookings.",
    start_url: "/",
    scope: "/",
    display: "standalone",
    orientation: "any",
    background_color: "#18181b",
    theme_color: "#18181b",
    categories: ["photo", "lifestyle"],
    // Photographer shortcuts and "Share → Photos by …" from the phone's gallery (Android)
    shortcuts: [
      { name: "Studio inbox", short_name: "Inbox", url: "/studio", icons: [{ src: "/icons/icon-192.png", sizes: "192x192" }] },
      { name: "Upload photos", short_name: "Upload", url: "/studio/upload", icons: [{ src: "/icons/icon-192.png", sizes: "192x192" }] },
    ],
    share_target: {
      action: "/studio/share",
      method: "POST",
      enctype: "multipart/form-data",
      params: { files: [{ name: "photos", accept: ["image/jpeg", "image/png", "image/webp", "image/*"] }] },
    },
    icons: [
      { src: "/icons/icon-192.png", sizes: "192x192", type: "image/png", purpose: "any" },
      { src: "/icons/icon-512.png", sizes: "512x512", type: "image/png", purpose: "any" },
      { src: "/icons/maskable-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
    ],
  };
}
