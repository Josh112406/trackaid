"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { getAdminAccess } from "@/lib/admin-auth";
import { createAdminClient } from "@/lib/supabase/admin";

const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const MERCHANT_PATTERN = /^org_[A-Za-z0-9]{10,}$/;

async function requireRoutingAdministrator() {
  const access = await getAdminAccess();
  if (
    access.mode !== "authenticated" ||
    !["owner", "reviewer"].includes(access.role)
  ) {
    throw new Error(
      "Only an authenticated owner or reviewer can change payout routing.",
    );
  }
  const admin = createAdminClient();
  if (!admin) throw new Error("The secure database client is not configured.");
  return { access, admin };
}

export async function submitPaymentDestination(formData: FormData) {
  const organizationId = String(formData.get("organizationId") ?? "");
  const merchantId = String(formData.get("merchantId") ?? "").trim();
  if (!UUID_PATTERN.test(organizationId) || !MERCHANT_PATTERN.test(merchantId))
    throw new Error("Enter a valid organization and PayMongo merchant ID.");

  const { access, admin } = await requireRoutingAdministrator();
  const { data: organization } = await admin
    .from("organizations")
    .select("id,status")
    .eq("id", organizationId)
    .eq("status", "verified")
    .maybeSingle();
  if (!organization)
    throw new Error("Only a verified organization can receive donations.");

  const { error } = await admin
    .from("organization_payment_destinations")
    .upsert(
      {
        organization_id: organizationId,
        paymongo_merchant_id: merchantId,
        status: "pending",
        submitted_by: access.userId,
        reviewed_by: null,
        reviewed_at: null,
      },
      { onConflict: "organization_id" },
    );
  if (error) throw new Error(error.message);

  await admin.from("admin_audit_log").insert({
    actor_user_id: access.userId,
    action: "payment_destination_submitted",
    entity_type: "organization",
    entity_id: organizationId,
    detail: { merchant_id_suffix: merchantId.slice(-8) },
  });
  revalidatePath("/admin/payouts");
  redirect("/admin/payouts?updated=pending");
}

export async function approvePaymentDestination(formData: FormData) {
  const organizationId = String(formData.get("organizationId") ?? "");
  if (!UUID_PATTERN.test(organizationId))
    throw new Error("Invalid organization.");

  const { access, admin } = await requireRoutingAdministrator();
  const now = new Date().toISOString();
  const { data: destination, error } = await admin
    .from("organization_payment_destinations")
    .update({
      status: "active",
      reviewed_by: access.userId,
      reviewed_at: now,
    })
    .eq("organization_id", organizationId)
    .eq("status", "pending")
    .neq("submitted_by", access.userId)
    .select("organization_id")
    .maybeSingle();
  if (error || !destination)
    throw new Error(
      error?.message ??
        "A different owner or reviewer must approve this payout route.",
    );

  await admin.from("admin_audit_log").insert({
    actor_user_id: access.userId,
    action: "payment_destination_approved",
    entity_type: "organization",
    entity_id: organizationId,
    detail: {},
  });
  revalidatePath("/admin/payouts");
  redirect("/admin/payouts?updated=active");
}
