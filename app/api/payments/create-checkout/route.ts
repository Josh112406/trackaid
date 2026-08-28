import { NextResponse } from "next/server";
import {
  createPayMongoCheckoutSession,
  PayMongoConfigurationError,
} from "@/lib/paymongo";
import { createPublicSupabaseClient } from "@/lib/supabase/public";

const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export async function POST(request: Request) {
  const body = (await request.json().catch(() => null)) as {
    campaignId?: unknown;
    amountCentavos?: unknown;
  } | null;
  if (
    !body ||
    typeof body.campaignId !== "string" ||
    !UUID_PATTERN.test(body.campaignId) ||
    !Number.isInteger(body.amountCentavos) ||
    Number(body.amountCentavos) < 10_000 ||
    Number(body.amountCentavos) > 50_000_000
  ) {
    return NextResponse.json(
      { message: "Choose an amount from PHP 100 to PHP 500,000." },
      { status: 400 },
    );
  }
  const { data: campaign, error } = await createPublicSupabaseClient()
    .from("campaigns")
    .select("id,slug,title,status")
    .eq("id", body.campaignId)
    .eq("status", "published")
    .maybeSingle();
  if (error || !campaign)
    return NextResponse.json(
      { message: "This campaign is not open for donations." },
      { status: 404 },
    );
  try {
    const origin =
      process.env.NEXT_PUBLIC_SITE_URL?.replace(/\/$/, "") ??
      new URL(request.url).origin;
    const checkout = await createPayMongoCheckoutSession({
      campaignId: campaign.id,
      campaignSlug: campaign.slug,
      campaignTitle: campaign.title,
      amountCentavos: Number(body.amountCentavos),
      origin,
    });
    return NextResponse.json(checkout, { status: 201 });
  } catch (caught) {
    if (caught instanceof PayMongoConfigurationError)
      return NextResponse.json({ message: caught.message }, { status: 503 });
    console.error("PayMongo checkout creation failed", caught);
    return NextResponse.json(
      { message: "Checkout could not be started. No charge was made." },
      { status: 502 },
    );
  }
}
