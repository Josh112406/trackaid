"use server";

import { revalidatePath } from "next/cache";

import { getAdminAccess } from "@/lib/admin-auth";
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
    .select("id,status,submitted_by")
    .eq("id", id)
    .maybeSingle();
  if (!submission || submission.status === "approved") {
    return { ok: false, message: "This program is no longer reviewable." };
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
  const { error } = await admin
    .from("program_submissions")
    .update({
      status: next,
      reviewed_by: reviewed ? access.userId : null,
      reviewed_at: reviewed ? new Date().toISOString() : null,
    })
    .eq("id", id)
    .neq("status", "approved");
  if (error)
    return { ok: false, message: "The review decision could not be saved." };

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
  return { ok: true, message: `Program marked ${next.replace("_", " ")}.` };
}
