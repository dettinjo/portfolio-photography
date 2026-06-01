// portfolio-frontend/src/app/[locale]/photography/leave-a-review/page.tsx
import { Suspense } from "react";
import { getTranslations } from "next-intl/server";
import { Metadata } from "next";
import { LeaveReviewForm } from "@/components/sections/LeaveReviewForm";

// --- THIS IS THE DEFINITIVE FIX (Part 1): Define the correct Props type ---
type Props = {
  params: Promise<{ locale: string }>;
};

// --- THIS IS THE DEFINITIVE FIX (Part 2): Await the params Promise in generateMetadata ---
export async function generateMetadata({ params }: Props): Promise<Metadata> {
  // Await the promise to safely get the locale value
  const { locale } = await params;

  const t = await getTranslations({ locale, namespace: "photography" });
  return {
    title: t("LeaveReviewPage.title"),
    robots: {
      index: false,
      follow: false,
    },
  };
}

export default function LeaveReviewPage() {
  const siteKey = process.env.NEXT_PUBLIC_RECAPTCHA_SITE_KEY;

  if (!siteKey) {
    console.error(
      "FATAL: NEXT_PUBLIC_RECAPTCHA_SITE_KEY is not set in environment variables."
    );
    return null;
  }

  return (
    <Suspense>
      <LeaveReviewForm siteKey={siteKey} />
    </Suspense>
  );
}
