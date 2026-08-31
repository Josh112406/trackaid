"use server";

import { revalidatePath } from "next/cache";

import { getAdminAccess } from "@/lib/admin-auth";
import { approvedProgramSourceSlug } from "@/lib/program-publication";
import { createAdminClient } from "@/lib/supabase/admin";
import { uuid } from "@/lib/validation";

type ReviewDecision = "approved" | "needs_information" | "rejected";

export async function reviewProgram(idValue: string, next: ReviewDecision) {
  let id: string;
  try {
    id = uuid(idValue, "Program");
  } catch (error) {
    return { ok: false, message: (error as Error).message };
  }
  if (!["approved", "needs_information", "rejected"].includes(next)) {
    return { ok: false, message: "Invalid review decision." };
  }

  const access = await getAdminAccess();
  if (
    access.mode !== "authenticated" ||
    (access.role !== "owner" && access.role !== "reviewer")
  ) {
    return { ok: false, message: "Owner or reviewer access is required." };
  }
  const admin = createAdminClient();
  if (!admin) {
    return { ok: false, message: "Secure review storage is unavailable." };
  }

  const { data: submission } = await admin
    .from("program_submissions")
    .select(
      "id,status,submitted_by,organization_name,program_name,location,summary,public_source_url,official_domain",
    )
    .eq("id", id)
    .maybeSingle();
  if (!submission) {
    return { ok: false, message: "This program is no longer reviewable." };
  }

  const publishApprovedProgram = async (visible: boolean) => {
    const now = new Date().toISOString();
    const { error } = await admin.from("external_campaign_sources").upsert(
      {
        slug: approvedProgramSourceSlug(submission.program_name, submission.id),
        organization_name: submission.organization_name,
        title: submission.program_name,
        location: submission.location,
        summary: submission.summary,
        official_source_url: submission.public_source_url,
        donation_url: submission.public_source_url,
        source_domain:
          submission.official_domain ??
          new URL(submission.public_source_url).hostname.toLowerCase(),
        source_health: "healthy",
        last_checked_at: now,
        last_success_at: now,
        consecutive_failures: 0,
        is_visible: visible,
      },
      { onConflict: "official_source_url" },
    );
    return error;
  };

  if (submission.status === "approved") {
    if (next !== "approved") {
      return { ok: false, message: "Approved programs cannot be re-reviewed." };
    }
    const publishError = await publishApprovedProgram(true);
    if (publishError) {
      return {
        ok: false,
        message: "The approved program could not be published.",
      };
    }
    await admin.from("admin_audit_log").insert({
      actor_user_id: access.userId,
      action: "approved_program_published",
      entity_type: "program_submission",
      entity_id: id,
      detail: {},
    });
    revalidatePath("/");
    revalidatePath("/campaigns");
    revalidatePath("/official-sources");
    revalidatePath(`/admin/programs/${id}`);
    return { ok: true, message: "Approved program published on the website." };
  }

  const isOwnSubmission = submission.submitted_by === access.userId;
  if (isOwnSubmission && next === "rejected") {
    return {
      ok: false,
      message: "A different reviewer must reject this program.",
    };
  }
  if (isOwnSubmission && next === "approved" && access.role !== "owner") {
    return {
      ok: false,
      message: "Only an owner can approve their own program submission.",
    };
  }

  const reviewed = next === "approved" || next === "rejected";
  const { data: reviewedSubmission, error } = await admin
    .from("program_submissions")
    .update({
      status: next,
      reviewed_by: reviewed ? access.userId : null,
      reviewed_at: reviewed ? new Date().toISOString() : null,
    })
    .eq("id", id)
    .neq("status", "approved")
    .select("id")
    .maybeSingle();
  if (error || !reviewedSubmission)
    return { ok: false, message: "The review decision could not be saved." };

  if (next === "approved") {
    const publishError = await publishApprovedProgram(true);
    if (publishError) {
      return {
        ok: false,
        message:
          "The program was approved but publication failed. Use Publish on website to retry.",
      };
    }
    await admin.from("analytics_events").insert({
      event_kind: "submission_approved",
      path: "/admin/programs",
      metadata: { submission_id: id },
    });
  }

  if (next !== "approved") {
    await admin.from("admin_audit_log").insert({
      actor_user_id: access.userId,
      action: `program_${next}`,
      entity_type: "program_submission",
      entity_id: id,
      detail: { owner_override: isOwnSubmission },
    });
  }
  revalidatePath(`/admin/programs/${id}`);
  revalidatePath("/admin/programs");
  if (next === "approved") {
    revalidatePath("/");
    revalidatePath("/campaigns");
    revalidatePath("/official-sources");
  }
  return {
    ok: true,
    message:
      next === "approved"
        ? "Program approved and published on the website."
        : `Program marked ${next.replace("_", " ")}.`,
  };
}
