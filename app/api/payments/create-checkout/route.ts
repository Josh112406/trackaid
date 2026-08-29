import { NextResponse } from "next/server";
import {
  createPayMongoCheckoutSession,
  PayMongoConfigurationError,
} from "@/lib/paymongo";
import { createAdminClient } from "@/lib/supabase/admin";

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
  const admin = createAdminClient();
  if (!admin)
    return NextResponse.json(
      { message: "Secure checkout storage is not configured." },
      { status: 503 },
    );
  const { data: campaign, error } = await admin
    .from("campaigns")
    .select(
      "id,slug,title,status,is_demonstration,organization_id,organizations(status)",
    )
    .eq("id", body.campaignId)
    .eq("status", "published")
    .maybeSingle();
  if (error || !campaign)
    return NextResponse.json(
      { message: "This campaign is not open for donations." },
      { status: 404 },
    );
  const organization = campaign.organizations as { status?: string } | null;
  if (organization?.status !== "verified")
    return NextResponse.json(
      { message: "This organization is not verified for donations." },
      { status: 409 },
    );
  const { data: destination, error: destinationError } = await admin
    .from("organization_payment_destinations")
    .select("paymongo_merchant_id,status")
    .eq("organization_id", campaign.organization_id)
    .eq("status", "active")
    .maybeSingle();
  if (destinationError) {
    console.error("PayMongo destination lookup failed", destinationError);
    return NextResponse.json(
      { message: "The organization payout route could not be verified." },
      { status: 503 },
    );
  }
  const liveMode = process.env.PAYMONGO_LIVE_MODE === "true";
  if (campaign.is_demonstration && liveMode)
    return NextResponse.json(
      { message: "The payment sandbox is disabled in live mode." },
      { status: 409 },
    );
  if (liveMode && !destination)
    return NextResponse.json(
      {
        message:
          "Donations are paused until this organization’s direct PayMongo recipient is independently approved.",
      },
      { status: 409 },
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
      recipientMerchantId: destination?.paymongo_merchant_id ?? null,
    });
    const { error: donationError } = await admin.from("donations").insert({
      id: checkout.donationId,
      campaign_id: campaign.id,
      paymongo_checkout_session_id: checkout.checkoutSessionId,
      paymongo_payment_intent_id: null,
      amount_centavos: Number(body.amountCentavos),
      fee_centavos: 0,
      net_amount_centavos: 0,
      currency: "PHP",
      status: "pending",
      livemode: checkout.livemode ?? liveMode,
    });
    if (donationError) {
      console.error("Pending donation persistence failed", donationError);
      return NextResponse.json(
        { message: "Checkout could not be recorded. No charge was made." },
        { status: 500 },
      );
    }
    await admin.from("analytics_events").insert({
      event_kind: "payment_intent_created",
      campaign_id: campaign.id,
      path: `/campaigns/${campaign.slug}`,
      amount_centavos: Number(body.amountCentavos),
      metadata: { routing: checkout.routing },
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
