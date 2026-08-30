import {
  createPayMongoCheckoutSession,
  PayMongoConfigurationError,
} from "@/lib/paymongo";
import {
  consumeRateLimit,
  noStoreJson,
  readJsonObject,
  requestClientIdentifier,
} from "@/lib/security";
import { createAdminClient } from "@/lib/supabase/admin";
import { botSignals, uuid } from "@/lib/validation";

export async function POST(request: Request) {
  const body = await readJsonObject(request, 4096).catch(() => null);
  let campaignId: string;
  try {
    campaignId = uuid(body?.campaignId, "Campaign");
  } catch {
    campaignId = "";
  }
  if (
    !body ||
    !campaignId ||
    !botSignals(body) ||
    !Number.isInteger(body.amountCentavos) ||
    Number(body.amountCentavos) < 10_000 ||
    Number(body.amountCentavos) > 50_000_000
  ) {
    return noStoreJson(
      { message: "Choose an amount from PHP 100 to PHP 500,000." },
      { status: 400 },
    );
  }
  const rateLimit = await consumeRateLimit({
    scope: "payment-checkout",
    identifiers: [requestClientIdentifier(request), campaignId],
    limit: 20,
    windowSeconds: 600,
  });
  if (!rateLimit.configured) {
    return noStoreJson(
      { message: "Secure checkout is temporarily unavailable." },
      { status: 503 },
    );
  }
  if (!rateLimit.allowed) {
    return noStoreJson(
      { message: "Too many checkout attempts. Try again in 10 minutes." },
      { status: 429 },
    );
  }
  const admin = createAdminClient();
  if (!admin)
    return noStoreJson(
      { message: "Secure checkout storage is not configured." },
      { status: 503 },
    );
  const { data: campaign, error } = await admin
    .from("campaigns")
    .select("id,slug,title,status,organization_id,organizations(status)")
    .eq("id", campaignId)
    .eq("status", "published")
    .eq("is_demonstration", false)
    .maybeSingle();
  if (error || !campaign)
    return noStoreJson(
      { message: "This campaign is not open for donations." },
      { status: 404 },
    );
  const organization = campaign.organizations as { status?: string } | null;
  if (organization?.status !== "verified")
    return noStoreJson(
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
    return noStoreJson(
      { message: "The organization payout route could not be verified." },
      { status: 503 },
    );
  }
  const liveMode = process.env.PAYMONGO_LIVE_MODE === "true";
  if (liveMode && !destination)
    return noStoreJson(
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
      return noStoreJson(
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
    return noStoreJson({ checkoutUrl: checkout.checkoutUrl }, { status: 201 });
  } catch (caught) {
    if (caught instanceof PayMongoConfigurationError)
      return noStoreJson({ message: caught.message }, { status: 503 });
    console.error("PayMongo checkout creation failed", caught);
    return noStoreJson(
      { message: "Checkout could not be started. No charge was made." },
      { status: 502 },
    );
  }
}
