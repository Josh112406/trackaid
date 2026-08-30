import { createHash, randomUUID } from "node:crypto";

import {
  consumeRateLimit,
  noStoreJson,
  requestClientIdentifier,
} from "@/lib/security";
import { createAdminClient } from "@/lib/supabase/admin";
import { createServerUserClient } from "@/lib/supabase/server";
import { botSignals, emailAddress, plainText } from "@/lib/validation";

const MAX_FILE_SIZE = 4_000_000;
const MAX_REQUEST_SIZE = 4_400_000;
const MIME_BY_EXTENSION: Record<string, string> = {
  pdf: "application/pdf",
  jpg: "image/jpeg",
  jpeg: "image/jpeg",
  png: "image/png",
  webp: "image/webp",
};

function slugify(name: string) {
  const base = name
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 120);
  return `${base || "organization"}-${randomUUID().slice(0, 8)}`;
}

function verifiedFileType(file: File, bytes: Uint8Array) {
  const extension = file.name.split(".").pop()?.toLowerCase() ?? "";
  const mimeType = MIME_BY_EXTENSION[extension];
  if (!mimeType || file.type !== mimeType) return null;

  const isPdf =
    mimeType === "application/pdf" &&
    bytes.length >= 5 &&
    String.fromCharCode(...bytes.slice(0, 5)) === "%PDF-";
  const isJpeg =
    mimeType === "image/jpeg" &&
    bytes[0] === 0xff &&
    bytes[1] === 0xd8 &&
    bytes[2] === 0xff;
  const isPng =
    mimeType === "image/png" &&
    bytes
      .slice(0, 8)
      .every(
        (value, index) =>
          value === [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a][index],
      );
  const isWebp =
    mimeType === "image/webp" &&
    String.fromCharCode(...bytes.slice(0, 4)) === "RIFF" &&
    String.fromCharCode(...bytes.slice(8, 12)) === "WEBP";
  return isPdf || isJpeg || isPng || isWebp ? { extension, mimeType } : null;
}

export async function POST(request: Request) {
  if (Number(request.headers.get("content-length") ?? 0) > MAX_REQUEST_SIZE) {
    return noStoreJson(
      { message: "The document must be no larger than 4 MB." },
      { status: 413 },
    );
  }
  const form = await request.formData().catch(() => null);
  if (
    !form ||
    !botSignals({
      website: form.get("website"),
      startedAt: form.get("startedAt"),
    })
  ) {
    return noStoreJson(
      { message: "The verification submission could not be verified." },
      { status: 400 },
    );
  }

  const supabase = await createServerUserClient();
  const { data: userData } = await supabase.auth.getUser();
  if (!userData.user) {
    return noStoreJson(
      { message: "Sign in again before submitting verification evidence." },
      { status: 401 },
    );
  }
  const { data: adminRole } = await supabase
    .from("app_admins")
    .select("role")
    .eq("user_id", userData.user.id)
    .maybeSingle();
  if (adminRole?.role !== "owner" && adminRole?.role !== "reviewer") {
    return noStoreJson(
      {
        message: "Only owners and reviewers can submit verification evidence.",
      },
      { status: 403 },
    );
  }

  const rateLimit = await consumeRateLimit({
    scope: "organization-verification",
    identifiers: [requestClientIdentifier(request), userData.user.id],
    limit: 3,
    windowSeconds: 86_400,
  });
  if (!rateLimit.configured) {
    return noStoreJson(
      { message: "Secure document storage is temporarily unavailable." },
      { status: 503 },
    );
  }
  if (!rateLimit.allowed) {
    return noStoreJson(
      { message: "Submission limit reached. Try again tomorrow." },
      { status: 429 },
    );
  }

  let organizationName: string;
  let officialEmail: string;
  let settlementAccountHolder: string;
  let originalName: string;
  const file = form.get("permitDocument");
  try {
    organizationName = plainText(form.get("organizationName"), {
      min: 2,
      max: 160,
      name: "Legal organization name",
    });
    officialEmail = emailAddress(form.get("officialEmail"));
    settlementAccountHolder = plainText(form.get("settlementAccountHolder"), {
      min: 2,
      max: 180,
      name: "Settlement account holder",
    });
    if (!(file instanceof File) || file.size < 1 || file.size > MAX_FILE_SIZE) {
      throw new Error("The document must be no larger than 4 MB.");
    }
    originalName = plainText(file.name, {
      min: 1,
      max: 255,
      name: "Document filename",
    });
  } catch (error) {
    return noStoreJson(
      {
        message: error instanceof Error ? error.message : "Invalid submission.",
      },
      { status: 400 },
    );
  }

  const buffer = await file.arrayBuffer();
  const bytes = new Uint8Array(buffer);
  const details = verifiedFileType(file, bytes);
  if (!details) {
    return noStoreJson(
      { message: "Use a valid PDF, JPG, PNG, or WebP document." },
      { status: 400 },
    );
  }

  const admin = createAdminClient();
  if (!admin) {
    return noStoreJson(
      { message: "Secure document storage is temporarily unavailable." },
      { status: 503 },
    );
  }
  const { data: organization, error: organizationError } = await admin
    .from("organizations")
    .insert({
      owner_user_id: userData.user.id,
      name: organizationName,
      slug: slugify(organizationName),
      status: "pending",
    })
    .select("id")
    .single();
  if (organizationError || !organization) {
    return noStoreJson(
      { message: "The organization record could not be created." },
      { status: 500 },
    );
  }

  const objectPath = `${organization.id}/verification/${randomUUID()}.${details.extension}`;
  const { error: uploadError } = await admin.storage
    .from("organization-evidence")
    .upload(objectPath, buffer, {
      cacheControl: "3600",
      contentType: details.mimeType,
      upsert: false,
    });
  if (uploadError) {
    await admin.from("organizations").delete().eq("id", organization.id);
    return noStoreJson(
      { message: "The document could not be stored securely." },
      { status: 500 },
    );
  }

  const evidenceHash = createHash("sha256").update(bytes).digest("hex");
  const { error: submissionError } = await admin
    .from("organization_verification_submissions")
    .insert({
      organization_id: organization.id,
      submitted_by: userData.user.id,
      official_email: officialEmail,
      settlement_account_holder: settlementAccountHolder,
      permit_object_path: objectPath,
      permit_original_name: originalName,
      permit_mime_type: details.mimeType,
      permit_size_bytes: file.size,
      permit_sha256: evidenceHash,
      status: "submitted",
    });
  if (submissionError) {
    await admin.storage.from("organization-evidence").remove([objectPath]);
    await admin.from("organizations").delete().eq("id", organization.id);
    return noStoreJson(
      { message: "The verification record could not be saved." },
      { status: 500 },
    );
  }

  return noStoreJson(
    { success: true, fingerprint: `${evidenceHash.slice(0, 12)}…` },
    { status: 201 },
  );
}
