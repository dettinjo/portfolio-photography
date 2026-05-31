import { redirect } from "next/navigation";

// The portfolio dashboard has moved to the Payload CMS admin panel.
export default function DashboardPage() {
  const cmsUrl = process.env.NEXT_PUBLIC_CMS_URL ?? "https://cms.joeldettinger.de";
  redirect(`${cmsUrl}/admin`);
}
