import { createHash, randomUUID } from "node:crypto";

type PaymentIntentResponse = {
  data: {
    id: string;
    type: "payment_intent";
    attributes: {
      client_key: string;
      status: string;
    };
  };
};

export class PayMongoConfigurationError extends Error {}

export async function createPayMongoPaymentIntent(input: {
  campaignId: string;
  amountCentavos: number;
}) {
  const secretKey = process.env.PAYMONGO_SECRET_KEY;
  if (!secretKey) {
    throw new PayMongoConfigurationError(
      "PayMongo test credentials are not configured.",
    );
  }

  const donationId = randomUUID();
  const idempotencyKey = createHash("sha256")
    .update(`trackaid:${input.campaignId}:${donationId}`)
    .digest("hex");

  const response = await fetch("https://api.paymongo.com/v1/payment_intents", {
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
          amount: input.amountCentavos,
          currency: "PHP",
          capture_type: "automatic",
          payment_method_allowed: ["card", "gcash", "paymaya"],
          payment_method_options: {
            card: { request_three_d_secure: "any" },
          },
          description: "TrackAid disaster-relief campaign donation",
          metadata: {
            campaign_id: input.campaignId,
            donation_id: donationId,
          },
        },
      },
    }),
    cache: "no-store",
  });

  const payload = (await response.json()) as PaymentIntentResponse & {
    errors?: Array<{ detail?: string }>;
  };
  if (!response.ok) {
    throw new Error(
      payload.errors?.[0]?.detail ??
        "PayMongo rejected the Payment Intent request.",
    );
  }

  return {
    donationId,
    paymentIntentId: payload.data.id,
    clientKey: payload.data.attributes.client_key,
    status: payload.data.attributes.status,
  };
}
