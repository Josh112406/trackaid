import { createHash } from "node:crypto";

import {
  consumeRateLimit,
  noStoreJson,
  readJsonObject,
  requestClientIdentifier,
} from "@/lib/security";
import { createAdminClient } from "@/lib/supabase/admin";
import { createServerUserClient } from "@/lib/supabase/server";
import { botSignals, httpsUrl, plainText } from "@/lib/validation";

const PROOF_KINDS = new Set([
  "public_website",
  "social_post",
  "pubmat",
  "video",
  "news_coverage",
  "registration",
  "representative_authorization",
  "payout_account",
  "budget",
  "beneficiary_plan",
  "other",
]);

export async function POST(request: Request) {
  const body = await readJsonObject(request, 16_384).catch(() => null);
  if (!body || !botSignals(body) || body.organizationOwned !== true) {
    return noStoreJson(
      { message: "The program submission could not be verified." },
      { status: 400 },
    );
  }

  const supabase = await createServerUserClient();
  const { data: userData } = await supabase.auth.getUser();
  if (!userData.user) {
    return noStoreJson(
      { message: "Sign in again before submitting a program." },
      { status: 401 },
    );
  }

  const rateLimit = await consumeRateLimit({
    scope: "program-submission",
    identifiers: [requestClientIdentifier(request), userData.user.id],
    limit: 5,
    windowSeconds: 86_400,
  });
  if (!rateLimit.configured) {
    return noStoreJson(
      { message: "Secure submission storage is temporarily unavailable." },
      { status: 503 },
    );
  }
  if (!rateLimit.allowed) {
    return noStoreJson(
      { message: "Submission limit reached. Try again tomorrow." },
      { status: 429 },
    );
  }

  let values: {
    organizationName: string;
    programName: string;
    location: string;
    summary: string;
    sourceUrl: URL;
    proofUrl: URL;
    proofKind: string;
    proofLabel: string;
  };
  try {
    const proofKind = plainText(body.proofKind, {
      min: 2,
      max: 40,
      name: "Evidence type",
    });
    if (!PROOF_KINDS.has(proofKind)) throw new Error("Invalid evidence type.");
    values = {
      organizationName: plainText(body.organizationName, {
        min: 2,
        max: 160,
        name: "Organization name",
      }),
      programName: plainText(body.programName, {
        min: 4,
        max: 180,
        name: "Program name",
      }),
      location: plainText(body.location, {
        min: 2,
        max: 240,
        name: "Location",
      }),
      summary: plainText(body.summary, {
        min: 20,
        max: 2000,
        name: "Public summary",
      }),
      sourceUrl: httpsUrl(body.sourceUrl, "Official source"),
      proofUrl: httpsUrl(body.proofUrl, "Public evidence"),
      proofKind,
      proofLabel: plainText(body.proofLabel, {
        min: 2,
        max: 180,
        name: "Evidence label",
      }),
    };
  } catch (error) {
    return noStoreJson(
      {
        message: error instanceof Error ? error.message : "Invalid submission.",
      },
      { status: 400 },
    );
  }

  const admin = createAdminClient();
  if (!admin) {
    return noStoreJson(
      { message: "Secure submission storage is temporarily unavailable." },
      { status: 503 },
    );
  }
  const submitted = body.intent !== "draft";
  const now = new Date().toISOString();
  const { data: submission, error: submissionError } = await admin
    .from("program_submissions")
    .insert({
      submitted_by: userData.user.id,
      organization_name: values.organizationName,
      program_name: values.programName,
      location: values.location,
      public_source_url: values.sourceUrl.toString(),
      official_domain: values.sourceUrl.hostname.toLowerCase(),
      summary: values.summary,
      status: submitted ? "submitted" : "draft",
      submitted_at: submitted ? now : null,
    })
    .select("id")
    .single();
  if (submissionError || !submission) {
    return noStoreJson(
      { message: "The program could not be saved." },
      { status: 500 },
    );
  }

  const publicProofUrl = values.proofUrl.toString();
  const { error: proofError } = await admin.from("program_proofs").insert({
    submission_id: submission.id,
    kind: values.proofKind as
      | "public_website"
      | "social_post"
      | "pubmat"
      | "video"
      | "news_coverage"
      | "registration"
      | "representative_authorization"
      | "payout_account"
      | "budget"
      | "beneficiary_plan"
      | "other",
    label: values.proofLabel,
    public_url: publicProofUrl,
    sha256: createHash("sha256").update(publicProofUrl).digest("hex"),
    is_identity_proof: [
      "registration",
      "representative_authorization",
      "payout_account",
    ].includes(values.proofKind),
  });
  if (proofError) {
    await admin.from("program_submissions").delete().eq("id", submission.id);
    return noStoreJson(
      {
        message: "The proof could not be attached. No submission was recorded.",
      },
      { status: 500 },
    );
  }

  await admin.from("analytics_events").insert({
    event_kind: "submission_created",
    path: "/submit-program",
    metadata: { submitted },
  });
  return noStoreJson(
    {
      success: true,
      message: submitted
        ? "Program submitted for review with its proof attached."
        : "Program and proof saved as a draft.",
    },
    { status: 201 },
  );
}
