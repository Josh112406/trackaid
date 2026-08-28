import { NextResponse } from "next/server";

import {
  createPayMongoPaymentIntent,
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
      {
        message:
          "Provide a valid campaign and an amount from PHP 100 to PHP 500,000.",
      },
      { status: 400 },
    );
  }

  const admin = createAdminClient();
  if (!admin) {
    return NextResponse.json(
      {
        message:
          "The demonstration is working, but payment creation is locked until Supabase and PayMongo test credentials are connected.",
      },
      { status: 503 },
    );
  }

  const { data: campaign, error } = await admin
    .from("campaigns")
    .select("id,status")
    .eq("id", body.campaignId)
    .eq("status", "published")
    .maybeSingle();

  if (error || !campaign) {
    return NextResponse.json(
      { message: "This campaign is not open for donations." },
      { status: 404 },
    );
  }

  try {
    const paymentIntent = await createPayMongoPaymentIntent({
      campaignId: campaign.id,
      amountCentavos: Number(body.amountCentavos),
    });
    return NextResponse.json(paymentIntent, { status: 201 });
  } catch (error) {
    if (error instanceof PayMongoConfigurationError) {
      return NextResponse.json({ message: error.message }, { status: 503 });
    }
    console.error("Payment Intent creation failed", error);
    return NextResponse.json(
      { message: "Payment setup failed safely. No charge was made." },
      { status: 502 },
    );
  }
}
