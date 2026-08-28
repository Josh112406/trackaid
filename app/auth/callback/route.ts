import { NextResponse } from "next/server";

import { createServerUserClient } from "@/lib/supabase/server";

export async function GET(request: Request) {
  const url = new URL(request.url);
  const code = url.searchParams.get("code");
  const next =
    url.searchParams.get("next") === "/submit-program"
      ? "/submit-program"
      : "/submit-program";

  if (code) {
    const supabase = await createServerUserClient();
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error) return NextResponse.redirect(new URL(next, url.origin));
  }

  return NextResponse.redirect(
    new URL("/submit-program?error=auth_callback", url.origin),
  );
}
