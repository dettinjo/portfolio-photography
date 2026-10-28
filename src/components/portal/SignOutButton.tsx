"use client";

import { clearOfflineData } from "@/components/portal/SaveOffline";

// Signing out also forgets galleries saved on this device and unsent picks.
export function SignOutButton({ label }: { label: string }) {
  return (
    <button
      type="submit"
      onClick={async (e) => {
        const form = e.currentTarget.form;
        if (!form) return;
        e.preventDefault();
        await clearOfflineData();
        form.submit();
      }}
      className="readout text-muted-foreground transition hover:text-rec"
    >
      {label} ↗
    </button>
  );
}
