import { createHash } from "node:crypto";

import { after, NextResponse } from "next/server";

import { verifyPayMongoSignature } from "@/lib/paymongo-signature";
import { processLedgerJobs } from "@/lib/ledger";
import { createAdminClient } from "@/lib/supabase/admin";
import {
  getPayMongoEventType,
  processPayMongoEvent,
} from "@/lib/webhook-processing";

export async function POST(request: Request) {
  const rawBody = await request.text();
  const signature = request.headers.get("paymongo-signature");
  const webhookSecret = process.env.PAYMONGO_WEBHOOK_SECRET;

  if (!signature || !webhookSecret) {
    return NextResponse.json(
      { error: "Webhook verification is not configured." },
      { status: 503 },
    );
  }

  const mode = process.env.PAYMONGO_LIVE_MODE === "true" ? "live" : "test";
  if (
    !verifyPayMongoSignature({
      rawBody,
      header: signature,
      webhookSecret,
      mode,
    })
  ) {
    return NextResponse.json(
      { error: "Invalid webhook signature." },
      { status: 401 },
    );
  }

  let payload: Record<string, unknown>;
  try {
    payload = JSON.parse(rawBody) as Record<string, unknown>;
  } catch {
    return NextResponse.json(
      { error: "Invalid JSON payload." },
      { status: 400 },
    );
  }
  const event = payload.data as
    { id?: string; attributes?: { type?: string } } | undefined;
  const payloadSha256 = createHash("sha256").update(rawBody).digest("hex");
  const eventId = event?.id ?? `sha256:${payloadSha256}`;
  const eventType = getPayMongoEventType(payload);

  const admin = createAdminClient();
  if (!admin) {
    return NextResponse.json(
      { error: "Database is not configured." },
      { status: 503 },
    );
  }

  const { error } = await admin.from("webhook_events").insert({
    id: eventId,
    event_type: eventType,
    payload_sha256: payloadSha256,
    status: "received",
  });

  if (error?.code === "23505") {
    return NextResponse.json({ received: true, duplicate: true });
  }
  if (error) {
    console.error("Webhook persistence failed", error);
    return NextResponse.json(
      { error: "Could not persist webhook." },
      { status: 500 },
    );
  }

  after(async () => {
    const result = await processPayMongoEvent(payload, eventId);
    if (result === "paid") await processLedgerJobs(1);
  });
  return NextResponse.json({ received: true });
}
