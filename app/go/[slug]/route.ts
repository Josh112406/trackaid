import { createHash, randomUUID } from "node:crypto";
import { NextRequest, NextResponse } from "next/server";

import {
  consumeRateLimit,
  requestClientIdentifier,
  scopedRateLimitIdentifier,
} from "@/lib/security";
import { createAdminClient } from "@/lib/supabase/admin";
import { createPublicSupabaseClient } from "@/lib/supabase/public";
import { findOfficialSource } from "@/lib/official-sources";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ slug: string }> },
) {
  const { slug } = await params;
  const { data: liveSource, error: sourceError } =
    await createPublicSupabaseClient()
      .from("external_campaign_sources")
      .select("slug, donation_url, source_domain")
      .eq("slug", slug)
      .eq("is_visible", true)
      .maybeSingle();
  const fallbackSource = findOfficialSource(slug);
  const source = liveSource
    ? {
        slug: liveSource.slug,
        donationUrl: liveSource.donation_url,
        sourceDomain: liveSource.source_domain,
      }
    : sourceError
      ? fallbackSource
      : undefined;
  if (!source)
    return NextResponse.redirect(new URL("/campaigns#official", request.url));

  const sessionToken =
    request.cookies.get("trackaid_session")?.value ?? randomUUID();
  const analyticsRateLimit = await consumeRateLimit({
    scope: "external-redirect-analytics",
    identifiers: [
      scopedRateLimitIdentifier(requestClientIdentifier(request), slug),
    ],
    limit: 10,
    windowSeconds: 60,
  });
  const admin = analyticsRateLimit.allowed ? createAdminClient() : null;
  if (admin) {
    await admin.from("analytics_events").insert({
      event_kind: "external_redirect",
      path: `/go/${slug}`,
      session_token_hash: createHash("sha256")
        .update(sessionToken)
        .digest("hex"),
      metadata: { source_slug: slug, destination_domain: source.sourceDomain },
    });
  }

  const response = NextResponse.redirect(source.donationUrl, 307);
  if (!request.cookies.has("trackaid_session")) {
    response.cookies.set("trackaid_session", sessionToken, {
      httpOnly: true,
      maxAge: 60 * 60 * 24,
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
    });
  }
  return response;
}
