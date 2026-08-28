"use client";

import {
  CheckCircle2,
  FileUp,
  FolderOpen,
  LoaderCircle,
  LockKeyhole,
  ShieldAlert,
} from "lucide-react";
import Link from "next/link";
import { FormEvent, useEffect, useState } from "react";

import { createBrowserSupabaseClient } from "@/lib/supabase/browser";

const MAX_FILE_SIZE = 10 * 1024 * 1024;
const MIME_BY_EXTENSION: Record<string, string> = {
  pdf: "application/pdf",
  jpg: "image/jpeg",
  jpeg: "image/jpeg",
  png: "image/png",
  webp: "image/webp",
};

type AccessState = "checking" | "ready" | "signed-out" | "forbidden";

function slugifyOrganization(name: string) {
  const base = name
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 120);

  return `${base || "organization"}-${crypto.randomUUID().slice(0, 8)}`;
}

function fileDetails(file: File) {
  const extension = file.name.split(".").pop()?.toLowerCase() ?? "";
  const inferredMime = MIME_BY_EXTENSION[extension];
  if (!inferredMime || (file.type && file.type !== inferredMime)) return null;
  return { extension, mimeType: file.type || inferredMime };
}

async function sha256Hex(buffer: ArrayBuffer) {
  const digest = await crypto.subtle.digest("SHA-256", buffer);
  return Array.from(new Uint8Array(digest), (byte) =>
    byte.toString(16).padStart(2, "0"),
  ).join("");
}

export function OrganizationVerificationForm() {
  const [supabase] = useState(createBrowserSupabaseClient);
  const [access, setAccess] = useState<AccessState>("checking");
  const [file, setFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");
  const [complete, setComplete] = useState(false);

  useEffect(() => {
    let active = true;

    async function checkAccess() {
      const { data } = await supabase.auth.getUser();
      if (!active) return;
      if (!data.user) {
        setAccess("signed-out");
        return;
      }

      const { data: admin } = await supabase
        .from("app_admins")
        .select("role")
        .eq("user_id", data.user.id)
        .maybeSingle();
      if (!active) return;

      setAccess(
        admin?.role === "owner" || admin?.role === "reviewer"
          ? "ready"
          : "forbidden",
      );
    }

    void checkAccess();
    return () => {
      active = false;
    };
  }, [supabase]);

  const canSubmit = access === "ready" && !loading && !complete;

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setMessage("");
    setComplete(false);

    const currentForm = event.currentTarget;
    const values = new FormData(currentForm);
    const organizationName = String(
      values.get("organizationName") ?? "",
    ).trim();
    const officialEmail = String(values.get("officialEmail") ?? "")
      .trim()
      .toLowerCase();
    const settlementAccountHolder = String(
      values.get("settlementAccountHolder") ?? "",
    ).trim();

    if (!canSubmit) {
      setMessage("Sign in with an invited owner or reviewer account first.");
      return;
    }
    if (organizationName.length < 2 || organizationName.length > 160) {
      setMessage("Enter the organization’s complete legal name.");
      return;
    }
    if (!officialEmail.includes("@") || officialEmail.length > 254) {
      setMessage("Enter a valid official email address.");
      return;
    }
    if (
      settlementAccountHolder.length < 2 ||
      settlementAccountHolder.length > 180
    ) {
      setMessage("Enter the legal name registered on the settlement account.");
      return;
    }
    if (!file) {
      setMessage("Choose a permit or authority document.");
      return;
    }
    if (file.size < 1 || file.size > MAX_FILE_SIZE) {
      setMessage("The document must be no larger than 10 MB.");
      return;
    }
    if (file.name.length > 255) {
      setMessage("The document filename must be 255 characters or fewer.");
      return;
    }

    const details = fileDetails(file);
    if (!details) {
      setMessage("Use a PDF, JPG, PNG, or WebP document.");
      return;
    }

    setLoading(true);
    const { data: userData } = await supabase.auth.getUser();
    const user = userData.user;
    if (!user) {
      setLoading(false);
      setAccess("signed-out");
      setMessage("Your session expired. Sign in again before submitting.");
      return;
    }

    const { data: organization, error: organizationError } = await supabase
      .from("organizations")
      .insert({
        owner_user_id: user.id,
        name: organizationName,
        slug: slugifyOrganization(organizationName),
        status: "pending",
      })
      .select("id")
      .single();

    if (organizationError || !organization) {
      setLoading(false);
      setMessage("The organization record could not be created. Try again.");
      return;
    }

    const fileId = crypto.randomUUID();
    const objectPath = `${organization.id}/verification/${fileId}.${details.extension}`;

    try {
      const fileBuffer = await file.arrayBuffer();
      const evidenceHash = await sha256Hex(fileBuffer);
      const { error: uploadError } = await supabase.storage
        .from("organization-evidence")
        .upload(objectPath, fileBuffer, {
          cacheControl: "3600",
          contentType: details.mimeType,
          upsert: false,
        });

      if (uploadError) {
        await supabase.from("organizations").delete().eq("id", organization.id);
        throw new Error("upload");
      }

      const { error: submissionError } = await supabase
        .from("organization_verification_submissions")
        .insert({
          organization_id: organization.id,
          submitted_by: user.id,
          official_email: officialEmail,
          settlement_account_holder: settlementAccountHolder,
          permit_object_path: objectPath,
          permit_original_name: file.name,
          permit_mime_type: details.mimeType,
          permit_size_bytes: file.size,
          permit_sha256: evidenceHash,
          status: "submitted",
        });

      if (submissionError) {
        await supabase.storage
          .from("organization-evidence")
          .remove([objectPath]);
        await supabase.from("organizations").delete().eq("id", organization.id);
        throw new Error("metadata");
      }

      currentForm.reset();
      setFile(null);
      setComplete(true);
      setMessage(
        `Submitted for review. Evidence fingerprint: ${evidenceHash.slice(0, 12)}…`,
      );
    } catch {
      setMessage(
        "The document could not be saved securely. No completed submission was recorded.",
      );
    } finally {
      setLoading(false);
    }
  }

  const disabled = access !== "ready" || loading || complete;

  return (
    <form className="verification-form" onSubmit={submit}>
      <label>
        Legal organization name
        <input
          name="organizationName"
          disabled={disabled}
          maxLength={160}
          placeholder="Registered legal name"
          required
        />
      </label>
      <label>
        Official email address
        <input
          name="officialEmail"
          disabled={disabled}
          maxLength={254}
          placeholder="name@organization.gov.ph"
          type="email"
          required
        />
      </label>
      <label
        className={`verification-upload-field${disabled ? " is-disabled" : ""}`}
        htmlFor="permit-document"
      >
        <span className="verification-upload-label">
          Permit or authority document
        </span>
        <input
          id="permit-document"
          className="sr-only"
          name="permitDocument"
          disabled={disabled}
          type="file"
          accept=".pdf,.jpg,.jpeg,.png,.webp,application/pdf,image/jpeg,image/png,image/webp"
          onChange={(event) => {
            setFile(event.currentTarget.files?.[0] ?? null);
            setMessage("");
          }}
          required
        />
        <span className="verification-file-picker" aria-hidden="true">
          <span className="verification-file-icon">
            <FileUp size={23} strokeWidth={1.8} />
          </span>
          <span className="verification-file-copy">
            <strong>
              {file ? "Document selected" : "Choose permit document"}
            </strong>
            <small>{file?.name ?? "No document selected"}</small>
          </span>
          <span className="verification-file-action">
            <FolderOpen size={16} /> {file ? "Change" : "Browse"}
          </span>
        </span>
        <span className="verification-file-hint">
          <LockKeyhole size={14} aria-hidden="true" /> Private Supabase storage
          · PDF, JPG, PNG or WebP · Maximum 10 MB
        </span>
      </label>
      <label>
        Registered settlement account holder
        <input
          name="settlementAccountHolder"
          disabled={disabled}
          maxLength={180}
          placeholder="Legal account-holder name—not the account number"
          required
        />
      </label>
      <button className="primary-button" disabled={!canSubmit} type="submit">
        {loading ? (
          <LoaderCircle className="spin" size={18} aria-hidden="true" />
        ) : complete ? (
          <CheckCircle2 size={18} aria-hidden="true" />
        ) : null}
        {loading
          ? "Saving securely"
          : complete
            ? "Submitted for review"
            : "Submit for review"}
      </button>

      {access === "checking" ? (
        <p className="form-message form-message-neutral" role="status">
          <LoaderCircle className="spin" size={18} aria-hidden="true" />
          Checking Supabase access…
        </p>
      ) : null}
      {access === "signed-out" ? (
        <p className="form-message form-message-blocked" role="status">
          <ShieldAlert size={18} aria-hidden="true" />
          <span>
            Sensitive documents require an invited administrator account.{" "}
            <Link href="/admin/login">Sign in securely</Link>.
          </span>
        </p>
      ) : null}
      {access === "forbidden" ? (
        <p className="form-message form-message-blocked" role="status">
          <ShieldAlert size={18} aria-hidden="true" /> Only owners and reviewers
          can submit verification evidence.
        </p>
      ) : null}
      {message ? (
        <p
          className={`form-message form-message-${complete ? "ready" : "blocked"}`}
          role="status"
        >
          {complete ? (
            <CheckCircle2 size={18} aria-hidden="true" />
          ) : (
            <ShieldAlert size={18} aria-hidden="true" />
          )}
          {message}
        </p>
      ) : null}
    </form>
  );
}
