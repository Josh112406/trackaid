"use client";

import { FormEvent, useState } from "react";
import {
  CheckCircle2,
  CircleAlert,
  FileCheck2,
  LoaderCircle,
  Send,
} from "lucide-react";

import { createBrowserSupabaseClient } from "@/lib/supabase/browser";

const proofKinds = [
  ["public_website", "Official website"],
  ["social_post", "Social-media post"],
  ["pubmat", "Pubmat or poster"],
  ["video", "Video"],
  ["news_coverage", "News coverage"],
  ["registration", "Organization registration"],
  ["representative_authorization", "Representative authorization"],
  ["payout_account", "Payout-account proof"],
  ["budget", "Campaign budget"],
  ["beneficiary_plan", "Beneficiary plan"],
  ["other", "Other evidence"],
] as const;

async function sha256(value: string) {
  const bytes = new TextEncoder().encode(value);
  const digest = await crypto.subtle.digest("SHA-256", bytes);
  return Array.from(new Uint8Array(digest), (byte) =>
    byte.toString(16).padStart(2, "0"),
  ).join("");
}

export function ProgramSubmissionForm() {
  const [state, setState] = useState<"idle" | "loading" | "ready" | "blocked">(
    "idle",
  );
  const [message, setMessage] = useState("");

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const formElement = event.currentTarget;
    const submitter = (event.nativeEvent as SubmitEvent)
      .submitter as HTMLButtonElement | null;
    const intent = submitter?.value === "review" ? "review" : "draft";
    const form = new FormData(formElement);
    const supabase = createBrowserSupabaseClient();

    setState("loading");
    setMessage("");
    const { data: userData, error: userError } = await supabase.auth.getUser();
    if (!userData.user) {
      setState("blocked");
      setMessage(
        userError
          ? "Your administrator session could not be verified. Sign in again."
          : "Sign in as an invited owner or reviewer before adding a program.",
      );
      return;
    }

    const sourceUrl = String(form.get("sourceUrl") ?? "").trim();
    const proofUrl = String(form.get("proofUrl") ?? "").trim();
    let sourceDomain: string;
    try {
      sourceDomain = new URL(sourceUrl).hostname.toLowerCase();
      new URL(proofUrl);
    } catch {
      setState("blocked");
      setMessage("Enter complete HTTPS links for the official page and proof.");
      return;
    }

    if (!sourceUrl.startsWith("https://") || !proofUrl.startsWith("https://")) {
      setState("blocked");
      setMessage("Official pages and proof links must use HTTPS.");
      return;
    }

    const { data: submission, error } = await supabase
      .from("program_submissions")
      .insert({
        submitted_by: userData.user.id,
        organization_name: String(form.get("organizationName") ?? ""),
        program_name: String(form.get("programName") ?? ""),
        location: String(form.get("location") ?? ""),
        public_source_url: sourceUrl,
        official_domain: sourceDomain,
        summary: String(form.get("summary") ?? ""),
        status: "draft",
      })
      .select("id")
      .single();

    if (error || !submission) {
      setState("blocked");
      setMessage(error?.message ?? "The submission could not be saved.");
      return;
    }

    const proofKind = String(
      form.get("proofKind") ?? "public_website",
    ) as (typeof proofKinds)[number][0];
    const { error: proofError } = await supabase.from("program_proofs").insert({
      submission_id: submission.id,
      kind: proofKind,
      label: String(form.get("proofLabel") ?? "Campaign evidence"),
      public_url: proofUrl,
      sha256: await sha256(proofUrl),
      is_identity_proof: [
        "registration",
        "representative_authorization",
        "payout_account",
      ].includes(proofKind),
    });

    if (proofError) {
      setState("blocked");
      setMessage(
        `The program draft was saved, but its proof needs attention: ${proofError.message}`,
      );
      return;
    }

    if (intent === "review") {
      const { data: reviewedSubmission, error: reviewError } = await supabase
        .from("program_submissions")
        .update({
          status: "submitted",
          submitted_at: new Date().toISOString(),
        })
        .eq("id", submission.id)
        .eq("submitted_by", userData.user.id)
        .eq("status", "draft")
        .select("id")
        .single();

      if (reviewError || !reviewedSubmission) {
        setState("blocked");
        setMessage(
          `The draft and proof were saved, but review submission failed: ${reviewError?.message ?? "no submission was updated"}`,
        );
        return;
      }
    }

    setState("ready");
    setMessage(
      intent === "review"
        ? "Campaign submitted for review with its proof attached."
        : "Campaign and proof saved as a draft. You can submit it for review when it is ready.",
    );
    formElement.reset();
  }

  return (
    <form className="program-submission-form" onSubmit={submit}>
      <fieldset>
        <legend>Program identity</legend>
        <div className="form-grid">
          <label>
            Organization name
            <input name="organizationName" required minLength={2} />
          </label>
          <label>
            Program name
            <input name="programName" required minLength={4} />
          </label>
          <label>
            Philippine location
            <input
              name="location"
              required
              placeholder="Province, city, or municipality"
            />
          </label>
          <label>
            Official organization or campaign URL
            <input
              name="sourceUrl"
              type="url"
              required
              placeholder="https://organization.org/campaign"
            />
          </label>
        </div>
        <label>
          Public summary
          <textarea name="summary" required minLength={20} rows={4} />
        </label>
      </fieldset>
      <fieldset>
        <legend>First proof item</legend>
        <p>
          Pubmats, posts, websites, video, and news can demonstrate that a
          fundraiser exists. Approval also requires organization registration or
          representative authorization.
        </p>
        <div className="form-grid">
          <label>
            Evidence type
            <select name="proofKind" defaultValue="public_website">
              {proofKinds.map(([value, label]) => (
                <option value={value} key={value}>
                  {label}
                </option>
              ))}
            </select>
          </label>
          <label>
            Evidence label
            <input
              name="proofLabel"
              required
              placeholder="Official campaign announcement"
            />
          </label>
        </div>
        <label>
          Public evidence URL
          <input
            name="proofUrl"
            type="url"
            required
            placeholder="https://..."
          />
        </label>
        <label className="submission-confirmation">
          <input name="organizationOwned" type="checkbox" required />
          <span>
            I confirm the official page is controlled by the named organization
            and the proof supports this fundraising campaign.
          </span>
        </label>
      </fieldset>
      <div className="submission-safety-note">
        <FileCheck2 size={22} aria-hidden="true" />
        <p>
          Private registration, authorization, and payout documents belong in
          encrypted Supabase Storage. Only their SHA-256 fingerprints become
          public or go on-chain.
        </p>
      </div>
      <div className="submission-actions">
        <button
          className="secondary-button"
          name="intent"
          value="draft"
          type="submit"
          disabled={state === "loading"}
        >
          Save draft
        </button>
        <button
          className="primary-button"
          name="intent"
          value="review"
          type="submit"
          disabled={state === "loading"}
        >
          {state === "loading" ? (
            <LoaderCircle className="spin" size={18} aria-hidden="true" />
          ) : state === "ready" ? (
            <CheckCircle2 size={18} aria-hidden="true" />
          ) : (
            <Send size={18} aria-hidden="true" />
          )}
          Submit for review
        </button>
      </div>
      {message ? (
        <p className={`form-message form-message-${state}`} role="status">
          {state === "blocked" ? (
            <CircleAlert size={18} aria-hidden="true" />
          ) : null}
          {message}
        </p>
      ) : null}
    </form>
  );
}
