import { createHash } from "node:crypto";

import { after, NextResponse } from "next/server";

import { verifyPayMongoSignature } from "@/lib/paymongo-signature";
import { createAdminClient } from "@/lib/supabase/admin";
import { processPayMongoEvent } from "@/lib/webhook-processing";

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

  const payload = JSON.parse(rawBody) as Record<string, unknown>;
  const event = payload.data as
    { id?: string; attributes?: { type?: string } } | undefined;
  if (!event?.id) {
    return NextResponse.json(
      { error: "Missing event identifier." },
      { status: 400 },
    );
  }

  const admin = createAdminClient();
  if (!admin) {
    return NextResponse.json(
      { error: "Database is not configured." },
      { status: 503 },
    );
  }

  const { error } = await admin.from("webhook_events").insert({
    id: event.id,
    event_type: event.attributes?.type ?? "unknown",
    payload_sha256: createHash("sha256").update(rawBody).digest("hex"),
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

  after(() => processPayMongoEvent(payload));
  return NextResponse.json({ received: true });
}
