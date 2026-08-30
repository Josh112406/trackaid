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

const MAX_FILE_SIZE = 4_000_000;
const MIME_BY_EXTENSION: Record<string, string> = {
  pdf: "application/pdf",
  jpg: "image/jpeg",
  jpeg: "image/jpeg",
  png: "image/png",
  webp: "image/webp",
};

type AccessState = "checking" | "ready" | "signed-out" | "forbidden";

function fileDetails(file: File) {
  const extension = file.name.split(".").pop()?.toLowerCase() ?? "";
  const inferredMime = MIME_BY_EXTENSION[extension];
  if (!inferredMime || (file.type && file.type !== inferredMime)) return null;
  return { extension, mimeType: file.type || inferredMime };
}

export function OrganizationVerificationForm() {
  const [supabase] = useState(createBrowserSupabaseClient);
  const [access, setAccess] = useState<AccessState>("checking");
  const [file, setFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");
  const [complete, setComplete] = useState(false);
  const [startedAt, setStartedAt] = useState(() => Date.now());

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
      setMessage("The document must be no larger than 4 MB.");
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

    values.set("organizationName", organizationName);
    values.set("officialEmail", officialEmail);
    values.set("settlementAccountHolder", settlementAccountHolder);

    setLoading(true);
    values.set("startedAt", String(startedAt));
    try {
      const response = await fetch("/api/organizations/submit", {
        method: "POST",
        body: values,
      });
      const result = (await response.json().catch(() => null)) as {
        fingerprint?: string;
        message?: string;
      } | null;
      if (!response.ok) {
        setMessage(
          result?.message ?? "The document could not be saved securely.",
        );
        return;
      }
      currentForm.reset();
      setFile(null);
      setComplete(true);
      setStartedAt(Date.now());
      setMessage(
        `Submitted for review. Evidence fingerprint: ${result?.fingerprint}`,
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
      <label className="bot-field" aria-hidden="true">
        Website
        <input name="website" tabIndex={-1} autoComplete="off" />
      </label>
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
          · PDF, JPG, PNG or WebP · Maximum 4 MB
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
