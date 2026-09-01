"use server";

import { createHash } from "node:crypto";

import { revalidatePath } from "next/cache";

import { getAdminAccess } from "@/lib/admin-auth";
import { processLedgerJobs } from "@/lib/ledger";
import { retrievePayMongoCheckoutSession } from "@/lib/paymongo";
import { createAdminClient } from "@/lib/supabase/admin";
import {
  checkoutSessionPaidEventPayload,
  normalizePaidDonationEvent,
  processPayMongoEvent,
} from "@/lib/webhook-processing";

export async function reconcilePendingPayments() {
  const access = await getAdminAccess();
  if (
    access.mode !== "authenticated" ||
    (access.role !== "owner" && access.role !== "reviewer")
  ) {
    return { ok: false, message: "Owner or reviewer access is required." };
  }
  const admin = createAdminClient();
  if (!admin)
    return { ok: false, message: "Secure payment storage is unavailable." };

  const { data: pending, error } = await admin
    .from("donations")
    .select("id,paymongo_checkout_session_id")
    .eq("status", "pending")
    .not("paymongo_checkout_session_id", "is", null)
    .order("created_at", { ascending: true })
    .limit(25);
  if (error)
    return { ok: false, message: "Pending payments could not be loaded." };
  if (!pending?.length)
    return { ok: true, message: "There are no pending payments." };

  let reconciled = 0;
  let checked = 0;
  for (const donation of pending) {
    try {
      const sessionId = String(donation.paymongo_checkout_session_id);
      const session = await retrievePayMongoCheckoutSession(sessionId);
      const eventId = `reconcile:${sessionId}`;
      const payload = checkoutSessionPaidEventPayload(session, eventId);
      const paid = normalizePaidDonationEvent(payload);
      checked += 1;
      if (!paid || paid.donationId !== donation.id) continue;

      const rawPayload = JSON.stringify(payload);
      await admin.from("webhook_events").upsert(
        {
          id: eventId,
          event_type: "checkout_session.payment.paid",
          payload_sha256: createHash("sha256").update(rawPayload).digest("hex"),
          status: "received",
          processing_error: null,
          processed_at: null,
        },
        { onConflict: "id" },
      );
      if ((await processPayMongoEvent(payload, eventId)) === "paid") {
        reconciled += 1;
      }
    } catch (caught) {
      console.error("Pending PayMongo reconciliation failed", caught);
    }
  }

  if (reconciled) await processLedgerJobs(Math.min(reconciled, 5));
  revalidatePath("/admin/transactions");
  revalidatePath("/campaigns", "layout");
  revalidatePath("/public-audit");
  return {
    ok: true,
    message: reconciled
      ? `${reconciled} payment${reconciled === 1 ? "" : "s"} reconciled.`
      : `${checked} pending payment${checked === 1 ? "" : "s"} checked; none are confirmed paid by PayMongo.`,
  };
}
