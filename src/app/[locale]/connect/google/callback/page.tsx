// Google OAuth is no longer supported — Strapi handled it, Payload does not.
// Redirect any stale Google callback URLs to the login page.
"use client";
import { useEffect } from "react";
import { useRouter } from "next/navigation";

export default function GoogleCallbackPage() {
  const router = useRouter();
  useEffect(() => { router.replace("/login"); }, [router]);
  return null;
}
