import { createHash } from "node:crypto";

import { createAdminClient } from "@/lib/supabase/admin";

type JsonObject = Record<string, unknown>;

function asObject(value: unknown): JsonObject {
  return value && typeof value === "object" ? (value as JsonObject) : {};
}

export async function processPayMongoEvent(payload: JsonObject) {
  const admin = createAdminClient();
  if (!admin) return;

  const event = asObject(payload.data);
  const eventId = typeof event.id === "string" ? event.id : null;
  const attributes = asObject(event.attributes);
  const eventType =
    typeof attributes.type === "string" ? attributes.type : "unknown";
  if (!eventId) return;

  if (eventType !== "payment.paid") {
    await admin
      .from("webhook_events")
      .update({ status: "ignored", processed_at: new Date().toISOString() })
      .eq("id", eventId);
    return;
  }

  const payment = asObject(attributes.data);
  const paymentAttributes = asObject(payment.attributes);
  const metadata = asObject(paymentAttributes.metadata);
  const campaignId =
    typeof metadata.campaign_id === "string" ? metadata.campaign_id : null;
  const donationId =
    typeof metadata.donation_id === "string" ? metadata.donation_id : null;
  const paymentId = typeof payment.id === "string" ? payment.id : null;
  const paymentIntentId =
    typeof paymentAttributes.payment_intent_id === "string"
      ? paymentAttributes.payment_intent_id
      : typeof paymentAttributes.payment_intent === "string"
        ? paymentAttributes.payment_intent
        : null;
  const amountCentavos = Number(paymentAttributes.amount);

  if (
    !campaignId ||
    !donationId ||
    !paymentId ||
    !paymentIntentId ||
    !Number.isInteger(amountCentavos) ||
    amountCentavos <= 0
  ) {
    await admin
      .from("webhook_events")
      .update({
        status: "failed",
        processing_error: "Missing required payment metadata or amount.",
        processed_at: new Date().toISOString(),
      })
      .eq("id", eventId);
    return;
  }

  const paidAtSeconds = Number(paymentAttributes.paid_at);
  const paidAt = Number.isFinite(paidAtSeconds)
    ? new Date(paidAtSeconds * 1000).toISOString()
    : new Date().toISOString();

  const { error: donationError } = await admin.from("donations").upsert(
    {
      id: donationId,
      campaign_id: campaignId,
      paymongo_payment_id: paymentId,
      paymongo_payment_intent_id: paymentIntentId,
      paymongo_event_id: eventId,
      amount_centavos: amountCentavos,
      currency: "PHP",
      status: "paid",
      paid_at: paidAt,
    },
    { onConflict: "paymongo_event_id", ignoreDuplicates: true },
  );

  if (donationError) {
    await admin
      .from("webhook_events")
      .update({ status: "failed", processing_error: donationError.message })
      .eq("id", eventId);
    return;
  }

  const payloadHash = `0x${createHash("sha256")
    .update(`${campaignId}:${donationId}:${amountCentavos}:${paymentIntentId}`)
    .digest("hex")}`;

  const { error: ledgerJobError } = await admin.from("ledger_jobs").upsert(
    {
      entity_type: "donation",
      entity_id: donationId,
      campaign_id: campaignId,
      amount_centavos: amountCentavos,
      payload_hash: payloadHash,
      status: "pending",
    },
    { onConflict: "entity_type,entity_id", ignoreDuplicates: true },
  );

  const { error: auditError } = await admin.from("audit_entries").upsert(
    {
      campaign_id: campaignId,
      entity_type: "donation",
      entity_id: donationId,
      title: "Donation recorded",
      public_detail:
        "A PayMongo payment was verified and queued for its Polygon audit anchor.",
      amount_centavos: amountCentavos,
      status: "pending",
      occurred_at: paidAt,
    },
    { onConflict: "entity_type,entity_id", ignoreDuplicates: true },
  );

  if (ledgerJobError || auditError) {
    await admin
      .from("webhook_events")
      .update({
        status: "failed",
        processing_error:
          (ledgerJobError ?? auditError)?.message ??
          "Audit queue persistence failed.",
        processed_at: new Date().toISOString(),
      })
      .eq("id", eventId);
    return;
  }

  await admin
    .from("webhook_events")
    .update({ status: "processed", processed_at: new Date().toISOString() })
    .eq("id", eventId);
}
