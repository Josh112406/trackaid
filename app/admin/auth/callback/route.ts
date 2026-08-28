import { NextResponse } from "next/server";

import { safeAdminRedirect } from "@/lib/admin-auth";
import { createServerUserClient } from "@/lib/supabase/server";

export async function GET(request: Request) {
  const url = new URL(request.url);
  const code = url.searchParams.get("code");
  const next = safeAdminRedirect(url.searchParams.get("next"));

  if (code) {
    const supabase = await createServerUserClient();
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error) return NextResponse.redirect(new URL(next, url.origin));
  }

  return NextResponse.redirect(
    new URL("/admin/login?error=auth_callback", url.origin),
  );
}
