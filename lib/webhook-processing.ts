import { createHash } from "node:crypto";

import { createAdminClient } from "@/lib/supabase/admin";

type JsonObject = Record<string, unknown>;

export type PaidDonationEvent = {
  eventType: "checkout_session.payment.paid" | "payment.paid";
  campaignId: string;
  donationId: string;
  checkoutSessionId: string | null;
  paymentId: string;
  paymentIntentId: string;
  amountCentavos: number;
  feeCentavos: number;
  netAmountCentavos: number;
  paymentMethodType: string | null;
  livemode: boolean | null;
  paidAt: string;
};

function asObject(value: unknown): JsonObject {
  return value && typeof value === "object" ? (value as JsonObject) : {};
}

function asArray(value: unknown): unknown[] {
  return Array.isArray(value) ? value : [];
}

function stringValue(value: unknown) {
  return typeof value === "string" && value ? value : null;
}

function integerValue(value: unknown) {
  const parsed = Number(value);
  return Number.isInteger(parsed) ? parsed : null;
}

function isoTime(value: unknown) {
  if (typeof value === "string") {
    const parsed = new Date(value);
    if (!Number.isNaN(parsed.getTime())) return parsed.toISOString();
  }
  const seconds = Number(value);
  if (Number.isFinite(seconds)) return new Date(seconds * 1000).toISOString();
  return new Date().toISOString();
}

export function getPayMongoEventType(payload: JsonObject) {
  const event = asObject(payload.data);
  const eventType = stringValue(asObject(event.attributes).type);
  if (eventType) return eventType;
  return stringValue(event.type) ?? "unknown";
}

function normalizeCheckoutPaidEvent(
  payload: JsonObject,
): PaidDonationEvent | null {
  const event = asObject(payload.data);
  const eventAttributes = asObject(event.attributes);
  const nestedSession = asObject(eventAttributes.data);
  const session = Object.keys(nestedSession).length
    ? nestedSession
    : asObject(event.data);
  const sessionAttributes = asObject(session.attributes);
  const metadata = asObject(sessionAttributes.metadata);
  const payment = asArray(sessionAttributes.payments)
    .map(asObject)
    .find((candidate) => asObject(candidate.attributes).status === "paid");
  if (!payment) return null;
  const paymentAttributes = asObject(payment.attributes);
  const paymentIntent = asObject(sessionAttributes.payment_intent);
  const source = asObject(paymentAttributes.source);
  const expectedAmount = integerValue(metadata.amount_centavos);
  const paidAmount = integerValue(paymentAttributes.amount);
  const feeCentavos = integerValue(paymentAttributes.fee) ?? 0;
  const netAmountCentavos =
    integerValue(paymentAttributes.net_amount) ??
    (paidAmount === null ? null : paidAmount - feeCentavos);
  const campaignId = stringValue(metadata.campaign_id);
  const donationId =
    stringValue(metadata.donation_id) ??
    stringValue(sessionAttributes.reference_number);
  const checkoutSessionId = stringValue(session.id);
  const paymentId = stringValue(payment.id);
  const paymentIntentId = stringValue(paymentIntent.id);

  if (
    !campaignId ||
    !donationId ||
    !checkoutSessionId ||
    !paymentId ||
    !paymentIntentId ||
    expectedAmount === null ||
    paidAmount === null ||
    expectedAmount !== paidAmount ||
    expectedAmount <= 0 ||
    feeCentavos < 0 ||
    netAmountCentavos === null ||
    netAmountCentavos <= 0 ||
    netAmountCentavos + feeCentavos > paidAmount
  ) {
    return null;
  }

  return {
    eventType: "checkout_session.payment.paid",
    campaignId,
    donationId,
    checkoutSessionId,
    paymentId,
    paymentIntentId,
    amountCentavos: expectedAmount,
    feeCentavos,
    netAmountCentavos,
    paymentMethodType:
      stringValue(source.type) ??
      stringValue(paymentAttributes.payment_method_type),
    livemode:
      typeof eventAttributes.livemode === "boolean"
        ? eventAttributes.livemode
        : typeof event.livemode === "boolean"
          ? event.livemode
          : typeof sessionAttributes.livemode === "boolean"
            ? sessionAttributes.livemode
            : null,
    paidAt: isoTime(
      paymentAttributes.paid_at ??
        eventAttributes.updated_at ??
        sessionAttributes.updated_at ??
        event.updated_at,
    ),
  };
}

export function checkoutSessionPaidEventPayload(
  session: JsonObject,
  eventId: string,
) {
  const attributes = asObject(session.attributes);
  return {
    data: {
      id: eventId,
      type: "event",
      attributes: {
        type: "checkout_session.payment.paid",
        livemode:
          typeof attributes.livemode === "boolean" ? attributes.livemode : null,
        created_at: attributes.updated_at ?? attributes.created_at,
        data: session,
      },
    },
  };
}

function normalizeLegacyPaidEvent(
  payload: JsonObject,
): PaidDonationEvent | null {
  const event = asObject(payload.data);
  const eventAttributes = asObject(event.attributes);
  const payment = asObject(eventAttributes.data);
  const paymentAttributes = asObject(payment.attributes);
  const metadata = asObject(paymentAttributes.metadata);
  const amountCentavos = integerValue(paymentAttributes.amount);
  const expectedAmount =
    integerValue(metadata.amount_centavos) ?? amountCentavos;
  const feeCentavos = integerValue(paymentAttributes.fee) ?? 0;
  const netAmountCentavos =
    integerValue(paymentAttributes.net_amount) ??
    (amountCentavos === null ? null : amountCentavos - feeCentavos);
  const campaignId = stringValue(metadata.campaign_id);
  const donationId = stringValue(metadata.donation_id);
  const paymentId = stringValue(payment.id);
  const paymentIntentId =
    stringValue(paymentAttributes.payment_intent_id) ??
    stringValue(paymentAttributes.payment_intent);

  if (
    !campaignId ||
    !donationId ||
    !paymentId ||
    !paymentIntentId ||
    expectedAmount === null ||
    amountCentavos === null ||
    expectedAmount !== amountCentavos ||
    amountCentavos <= 0 ||
    feeCentavos < 0 ||
    netAmountCentavos === null ||
    netAmountCentavos <= 0 ||
    netAmountCentavos + feeCentavos > amountCentavos
  ) {
    return null;
  }

  return {
    eventType: "payment.paid",
    campaignId,
    donationId,
    checkoutSessionId: null,
    paymentId,
    paymentIntentId,
    amountCentavos,
    feeCentavos,
    netAmountCentavos,
    paymentMethodType: stringValue(asObject(paymentAttributes.source).type),
    livemode:
      typeof eventAttributes.livemode === "boolean"
        ? eventAttributes.livemode
        : null,
    paidAt: isoTime(paymentAttributes.paid_at),
  };
}

export function normalizePaidDonationEvent(payload: JsonObject) {
  const eventType = getPayMongoEventType(payload);
  if (eventType === "checkout_session.payment.paid")
    return normalizeCheckoutPaidEvent(payload);
  if (eventType === "payment.paid") return normalizeLegacyPaidEvent(payload);
  return null;
}

async function markWebhookFailed(eventId: string, message: string) {
  const admin = createAdminClient();
  if (!admin) return;
  await admin
    .from("webhook_events")
    .update({
      status: "failed",
      processing_error: message.slice(0, 1000),
      processed_at: new Date().toISOString(),
    })
    .eq("id", eventId);
}

export async function processPayMongoEvent(
  payload: JsonObject,
  persistedEventId?: string,
): Promise<"paid" | "ignored" | "failed"> {
  const admin = createAdminClient();
  if (!admin) return "failed";

  const event = asObject(payload.data);
  const eventId = persistedEventId ?? stringValue(event.id);
  if (!eventId) return "failed";
  const eventType = getPayMongoEventType(payload);
  if (!["checkout_session.payment.paid", "payment.paid"].includes(eventType)) {
    await admin
      .from("webhook_events")
      .update({ status: "ignored", processed_at: new Date().toISOString() })
      .eq("id", eventId);
    return "ignored";
  }

  const paid = normalizePaidDonationEvent(payload);
  if (!paid) {
    await markWebhookFailed(
      eventId,
      "The signed event did not match the expected checkout amount or references.",
    );
    return "failed";
  }

  const expectedMode = process.env.PAYMONGO_LIVE_MODE === "true";
  if (paid.livemode !== null && paid.livemode !== expectedMode) {
    await markWebhookFailed(
      eventId,
      "Payment mode did not match this environment.",
    );
    return "failed";
  }

  const { data: pendingDonation, error: pendingError } = await admin
    .from("donations")
    .select(
      "id,campaign_id,amount_centavos,status,paymongo_checkout_session_id,paymongo_payment_id",
    )
    .eq("id", paid.donationId)
    .maybeSingle();

  if (
    pendingError ||
    !pendingDonation ||
    pendingDonation.campaign_id !== paid.campaignId ||
    Number(pendingDonation.amount_centavos) !== paid.amountCentavos ||
    (paid.checkoutSessionId &&
      pendingDonation.paymongo_checkout_session_id !== paid.checkoutSessionId)
  ) {
    await markWebhookFailed(
      eventId,
      "No matching TrackAid checkout was found.",
    );
    return "failed";
  }

  if (
    pendingDonation.status === "paid" &&
    pendingDonation.paymongo_payment_id === paid.paymentId
  ) {
    await admin
      .from("webhook_events")
      .update({ status: "processed", processed_at: new Date().toISOString() })
      .eq("id", eventId);
    return "paid";
  }

  const { data: updatedDonation, error: donationError } = await admin
    .from("donations")
    .update({
      paymongo_payment_id: paid.paymentId,
      paymongo_payment_intent_id: paid.paymentIntentId,
      paymongo_event_id: eventId,
      fee_centavos: paid.feeCentavos,
      net_amount_centavos: paid.netAmountCentavos,
      payment_method_type: paid.paymentMethodType,
      livemode: paid.livemode ?? expectedMode,
      status: "paid",
      paid_at: paid.paidAt,
    })
    .eq("id", paid.donationId)
    .eq("status", "pending")
    .select("id")
    .maybeSingle();

  if (donationError || !updatedDonation) {
    await markWebhookFailed(
      eventId,
      donationError?.message ?? "The matching donation was not pending.",
    );
    return "failed";
  }

  const payloadHash = `0x${createHash("sha256")
    .update(
      `${paid.campaignId}:${paid.donationId}:${paid.amountCentavos}:${paid.paymentIntentId}`,
    )
    .digest("hex")}`;

  const { error: ledgerJobError } = await admin.from("ledger_jobs").upsert(
    {
      entity_type: "donation",
      entity_id: paid.donationId,
      campaign_id: paid.campaignId,
      amount_centavos: paid.amountCentavos,
      payload_hash: payloadHash,
      status: "pending",
    },
    { onConflict: "entity_type,entity_id", ignoreDuplicates: true },
  );

  const { error: auditError } = await admin.from("audit_entries").upsert(
    {
      campaign_id: paid.campaignId,
      entity_type: "donation",
      entity_id: paid.donationId,
      title: "Donation recorded",
      public_detail:
        "A signed PayMongo payment was reconciled and queued for a matching PHP-denominated Solana audit record. The donation remains off-chain.",
      amount_centavos: paid.amountCentavos,
      status: "pending",
      occurred_at: paid.paidAt,
    },
    { onConflict: "entity_type,entity_id", ignoreDuplicates: true },
  );

  if (ledgerJobError || auditError) {
    await markWebhookFailed(
      eventId,
      (ledgerJobError ?? auditError)?.message ??
        "Audit queue persistence failed.",
    );
    return "failed";
  }

  await Promise.all([
    admin.from("analytics_events").insert({
      event_kind: "payment_paid",
      campaign_id: paid.campaignId,
      path: "/api/webhooks/paymongo",
      amount_centavos: paid.amountCentavos,
      metadata: {
        fee_centavos: paid.feeCentavos,
        net_amount_centavos: paid.netAmountCentavos,
        payment_method_type: paid.paymentMethodType,
      },
    }),
    admin
      .from("webhook_events")
      .update({
        status: "processed",
        processing_error: null,
        processed_at: new Date().toISOString(),
      })
      .eq("id", eventId),
  ]);
  return "paid";
}
