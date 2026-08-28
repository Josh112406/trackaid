import { createHash, randomUUID } from "node:crypto";

type CheckoutSessionResponse = {
  data: {
    id: string;
    type: "checkout_session";
    attributes: {
      checkout_url: string;
      status: string;
      payment_intent?: { id?: string };
    };
  };
  errors?: Array<{ detail?: string }>;
};

export class PayMongoConfigurationError extends Error {}

export async function createPayMongoCheckoutSession(input: {
  campaignId: string;
  campaignSlug: string;
  campaignTitle: string;
  amountCentavos: number;
  origin: string;
}) {
  const secretKey = process.env.PAYMONGO_SECRET_KEY;
  if (!secretKey)
    throw new PayMongoConfigurationError(
      "PayMongo checkout is not configured.",
    );
  const donationId = randomUUID();
  const idempotencyKey = createHash("sha256")
    .update(`trackaid-checkout:${input.campaignId}:${donationId}`)
    .digest("hex");
  const campaignUrl = `${input.origin}/campaigns/${input.campaignSlug}`;
  const response = await fetch(
    "https://api.paymongo.com/v1/checkout_sessions",
    {
      method: "POST",
      headers: {
        accept: "application/json",
        authorization: `Basic ${Buffer.from(`${secretKey}:`).toString("base64")}`,
        "content-type": "application/json",
        "idempotency-key": idempotencyKey,
      },
      body: JSON.stringify({
        data: {
          attributes: {
            cancel_url: `${campaignUrl}?checkout=cancelled`,
            success_url: `${campaignUrl}?checkout=success`,
            description: `Donation to ${input.campaignTitle}`,
            payment_method_types: [
              "card",
              "gcash",
              "paymaya",
              "grab_pay",
              "qrph",
            ],
            line_items: [
              {
                amount: input.amountCentavos,
                currency: "PHP",
                description: "Disaster-relief campaign contribution",
                name: input.campaignTitle,
                quantity: 1,
              },
            ],
            merchant: "TrackAid",
            reference_number: donationId,
            send_email_receipt: true,
            show_description: true,
            show_line_items: true,
            metadata: {
              campaign_id: input.campaignId,
              campaign_slug: input.campaignSlug,
              donation_id: donationId,
            },
          },
        },
      }),
      cache: "no-store",
    },
  );
  const payload = (await response.json()) as CheckoutSessionResponse;
  if (!response.ok)
    throw new Error(
      payload.errors?.[0]?.detail ?? "PayMongo rejected the checkout request.",
    );
  const checkoutUrl = payload.data.attributes.checkout_url;
  if (!checkoutUrl?.startsWith("https://checkout.paymongo.com/"))
    throw new Error("PayMongo returned an invalid checkout destination.");
  return {
    donationId,
    checkoutSessionId: payload.data.id,
    paymentIntentId: payload.data.attributes.payment_intent?.id ?? null,
    checkoutUrl,
  };
}
