"use server";

import { revalidatePath } from "next/cache";

import { getAdminAccess } from "@/lib/admin-auth";
import {
  approvedOrganizationSlug,
  approvedProgramCampaignSlug,
  approvedProgramSourceSlug,
} from "@/lib/program-publication";
import { createAdminClient } from "@/lib/supabase/admin";
import { pesoAmountToCentavos, plainText, uuid } from "@/lib/validation";

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
    return { ok: false, message: "This program is already approved." };
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
          "The program was approved, but its official source could not be listed.",
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
        ? "Program approved. Add its funding details to publish the campaign."
        : `Program marked ${next.replace("_", " ")}.`,
  };
}

export async function publishProgramCampaign(input: {
  submissionId: string;
  disasterName: string;
  targetBeneficiaries: string;
  fundingGoalPesos: string;
}) {
  let submissionId: string;
  let disasterName: string;
  let targetBeneficiaries: string;
  let fundingGoalCentavos: number;
  try {
    submissionId = uuid(input.submissionId, "Program");
    disasterName = plainText(input.disasterName, {
      min: 2,
      max: 180,
      name: "Cause or emergency name",
    });
    targetBeneficiaries = plainText(input.targetBeneficiaries, {
      min: 2,
      max: 500,
      name: "Target beneficiaries",
    });
    fundingGoalCentavos = pesoAmountToCentavos(input.fundingGoalPesos);
  } catch (error) {
    return { ok: false, message: (error as Error).message };
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
    return { ok: false, message: "Secure campaign storage is unavailable." };
  }

  const { data: submission, error: submissionError } = await admin
    .from("program_submissions")
    .select(
      "id,campaign_id,status,submitted_by,organization_name,program_name,location,summary",
    )
    .eq("id", submissionId)
    .maybeSingle();
  if (submissionError || !submission || submission.status !== "approved") {
    return { ok: false, message: "Only an approved program can be published." };
  }

  if (submission.campaign_id) {
    const { data: campaign } = await admin
      .from("campaigns")
      .select("slug")
      .eq("id", submission.campaign_id)
      .maybeSingle();
    return campaign
      ? {
          ok: true,
          message: "This campaign is already public.",
          campaignSlug: campaign.slug,
        }
      : { ok: false, message: "The linked campaign could not be loaded." };
  }

  const now = new Date().toISOString();
  let { data: organization, error: organizationError } = await admin
    .from("organizations")
    .select("id,status")
    .eq("owner_user_id", submission.submitted_by)
    .eq("name", submission.organization_name)
    .maybeSingle();
  if (organizationError) {
    return { ok: false, message: "The organization could not be prepared." };
  }
  if (organization?.status === "suspended") {
    return { ok: false, message: "This organization is suspended." };
  }
  if (!organization) {
    const created = await admin
      .from("organizations")
      .insert({
        owner_user_id: submission.submitted_by,
        name: submission.organization_name,
        slug: approvedOrganizationSlug(
          submission.organization_name,
          submission.submitted_by,
        ),
        description: submission.summary,
        status: "verified",
        verified_at: now,
      })
      .select("id,status")
      .single();
    organization = created.data;
    organizationError = created.error;
  } else if (organization.status !== "verified") {
    const verified = await admin
      .from("organizations")
      .update({ status: "verified", verified_at: now })
      .eq("id", organization.id)
      .select("id,status")
      .single();
    organization = verified.data;
    organizationError = verified.error;
  }
  if (organizationError || !organization) {
    return { ok: false, message: "The organization could not be verified." };
  }

  const { error: membershipError } = await admin
    .from("organization_members")
    .upsert(
      {
        organization_id: organization.id,
        user_id: submission.submitted_by,
        role: "owner",
      },
      { onConflict: "organization_id,user_id" },
    );
  if (membershipError) {
    return {
      ok: false,
      message: "Organization ownership could not be linked.",
    };
  }

  const campaignSlug = approvedProgramCampaignSlug(
    submission.program_name,
    submission.id,
  );
  let { data: campaign, error: campaignError } = await admin
    .from("campaigns")
    .select("id,slug,organization_id")
    .eq("slug", campaignSlug)
    .maybeSingle();
  if (campaignError) {
    return { ok: false, message: "The campaign could not be prepared." };
  }
  if (campaign && campaign.organization_id !== organization.id) {
    return { ok: false, message: "The campaign address is already in use." };
  }
  if (!campaign) {
    const created = await admin
      .from("campaigns")
      .insert({
        organization_id: organization.id,
        slug: campaignSlug,
        title: submission.program_name,
        disaster_name: disasterName,
        location: submission.location,
        summary: submission.summary,
        target_beneficiaries: targetBeneficiaries,
        funding_goal_centavos: fundingGoalCentavos,
        status: "published",
        is_demonstration: false,
        published_at: now,
      })
      .select("id,slug,organization_id")
      .single();
    campaign = created.data;
    campaignError = created.error;
  }
  if (campaignError || !campaign) {
    return { ok: false, message: "The public campaign could not be created." };
  }

  const { error: linkError } = await admin
    .from("program_submissions")
    .update({ campaign_id: campaign.id })
    .eq("id", submission.id)
    .eq("status", "approved");
  if (linkError) {
    return {
      ok: false,
      message: "The campaign was created but could not be linked.",
    };
  }

  await admin.from("admin_audit_log").insert({
    actor_user_id: access.userId,
    action: "program_campaign_published",
    entity_type: "campaign",
    entity_id: campaign.id,
    detail: { submission_id: submission.id },
  });
  await admin
    .from("external_campaign_sources")
    .update({ is_visible: false })
    .eq(
      "slug",
      approvedProgramSourceSlug(submission.program_name, submission.id),
    );
  revalidatePath("/");
  revalidatePath("/campaigns");
  revalidatePath(`/campaigns/${campaign.slug}`);
  revalidatePath("/public-audit");
  revalidatePath("/organizations");
  revalidatePath("/admin/programs");
  revalidatePath(`/admin/programs/${submission.id}`);
  return {
    ok: true,
    message: "Campaign published on the website.",
    campaignSlug: campaign.slug,
  };
}

export async function setProgramVisibility(idValue: string, visible: boolean) {
  if (typeof visible !== "boolean") {
    return { ok: false, message: "Invalid visibility change." };
  }
  let id: string;
  try {
    id = uuid(idValue, "Program");
  } catch (error) {
    return { ok: false, message: (error as Error).message };
  }
  const access = await getAdminAccess();
  if (
    access.mode !== "authenticated" ||
    (access.role !== "owner" && access.role !== "reviewer")
  ) {
    return { ok: false, message: "Owner or reviewer access is required." };
  }
  const admin = createAdminClient();
  if (!admin)
    return { ok: false, message: "Secure campaign storage is unavailable." };

  const { data: submission, error: submissionError } = await admin
    .from("program_submissions")
    .select("id,campaign_id,status,public_source_url")
    .eq("id", id)
    .maybeSingle();
  if (submissionError || !submission || submission.status !== "approved") {
    return { ok: false, message: "Only an approved program can be changed." };
  }

  let campaignSlug: string | null = null;
  if (submission.campaign_id) {
    const { data: campaign, error: campaignError } = await admin
      .from("campaigns")
      .update({
        status: visible ? "published" : "draft",
        published_at: visible ? new Date().toISOString() : null,
      })
      .eq("id", submission.campaign_id)
      .select("slug")
      .maybeSingle();
    if (campaignError || !campaign) {
      return {
        ok: false,
        message: "The public campaign could not be changed.",
      };
    }
    campaignSlug = campaign.slug;
  }

  const { error: sourceError } = await admin
    .from("external_campaign_sources")
    .update({ is_visible: visible && !submission.campaign_id })
    .eq("official_source_url", submission.public_source_url);
  if (sourceError) {
    return {
      ok: false,
      message: "The public program listing could not be changed.",
    };
  }

  await admin.from("admin_audit_log").insert({
    actor_user_id: access.userId,
    action: visible ? "program_restored" : "program_removed",
    entity_type: submission.campaign_id ? "campaign" : "program_submission",
    entity_id: submission.campaign_id ?? submission.id,
    detail: { submission_id: submission.id },
  });
  revalidatePath("/");
  revalidatePath("/campaigns");
  if (campaignSlug) revalidatePath(`/campaigns/${campaignSlug}`);
  revalidatePath("/official-sources");
  revalidatePath("/organizations");
  revalidatePath("/public-audit");
  revalidatePath("/admin/programs");
  revalidatePath(`/admin/programs/${id}`);
  return {
    ok: true,
    message: visible
      ? "Program restored on the website."
      : "Program removed from the website. Its records were preserved.",
  };
}
