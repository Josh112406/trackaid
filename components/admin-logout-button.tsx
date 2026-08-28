"use client";

import { LogOut } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";

import { createBrowserSupabaseClient } from "@/lib/supabase/browser";

export function AdminLogoutButton() {
  const router = useRouter();
  const [busy, setBusy] = useState(false);

  async function signOut() {
    setBusy(true);
    await createBrowserSupabaseClient().auth.signOut();
    router.replace("/admin/login");
    router.refresh();
  }

  return (
    <button disabled={busy} onClick={signOut} type="button">
      <LogOut size={15} aria-hidden="true" />{" "}
      {busy ? "Signing out…" : "Sign out"}
    </button>
  );
}
