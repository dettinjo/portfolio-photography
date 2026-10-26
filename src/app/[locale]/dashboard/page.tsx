import { redirect } from "next/navigation";

// The photographer dashboard is the Payload admin panel embedded in this app.
export default function DashboardPage() {
  redirect("/admin");
}
