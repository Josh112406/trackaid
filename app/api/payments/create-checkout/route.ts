import { formatPhp } from "@/lib/format";
import {
  createPayMongoCheckoutSession,
  PayMongoConfigurationError,
} from "@/lib/paymongo";
import {
  checkoutRateLimitRules,
  consumeRateLimit,
  noStoreJson,
  readJsonObject,
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
  const rateLimitRules = checkoutRateLimitRules(request, campaignId);
  const clientRateLimit = await consumeRateLimit(rateLimitRules.client);
  if (!clientRateLimit.configured) {
    return noStoreJson(
      { message: "Secure checkout is temporarily unavailable." },
      { status: 503 },
    );
  }
  if (!clientRateLimit.allowed) {
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
    .select(
      "id,slug,title,status,organization_id,funding_goal_centavos,received_centavos,organizations(status)",
    )
    .eq("id", campaignId)
    .eq("status", "published")
    .eq("is_demonstration", false)
    .maybeSingle();
  if (error || !campaign)
    return noStoreJson(
      { message: "This campaign is not open for donations." },
      { status: 404 },
    );
  if (campaign.funding_goal_centavos != null) {
    const remaining =
      campaign.funding_goal_centavos - (campaign.received_centavos ?? 0);
    if (remaining <= 0) {
      return noStoreJson(
        { message: "This campaign has reached its funding goal." },
        { status: 409 },
      );
    }
    if (Number(body.amountCentavos) > remaining) {
      return noStoreJson(
        {
          message: `The maximum remaining amount is ${formatPhp(remaining)}.`,
        },
        { status: 400 },
      );
    }
  }
  const organization = campaign.organizations as { status?: string } | null;
  if (organization?.status !== "verified")
    return noStoreJson(
      { message: "This organization is not verified for donations." },
      { status: 409 },
    );
  const campaignRateLimit = await consumeRateLimit(rateLimitRules.campaign);
  if (!campaignRateLimit.configured) {
    return noStoreJson(
      { message: "Secure checkout is temporarily unavailable." },
      { status: 503 },
    );
  }
  if (!campaignRateLimit.allowed) {
    return noStoreJson(
      { message: "Too many checkout attempts. Try again in 10 minutes." },
      { status: 429 },
    );
  }
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
    const origin = process.env.NEXT_PUBLIC_SITE_URL?.replace(/\/$/, "");
    if (!origin) {
      return noStoreJson(
        { message: "Checkout origin is not configured." },
        { status: 503 },
      );
    }
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
