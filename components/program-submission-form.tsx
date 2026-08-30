"use client";

import { FormEvent, useState } from "react";
import {
  CheckCircle2,
  CircleAlert,
  FileCheck2,
  LoaderCircle,
  Send,
} from "lucide-react";

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

export function ProgramSubmissionForm({ mode }: { mode: "public" | "admin" }) {
  const [state, setState] = useState<"idle" | "loading" | "ready" | "blocked">(
    "idle",
  );
  const [message, setMessage] = useState("");
  const [startedAt, setStartedAt] = useState(() => Date.now());

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const formElement = event.currentTarget;
    const submitter = (event.nativeEvent as SubmitEvent)
      .submitter as HTMLButtonElement | null;
    const requestedIntent = submitter?.value;
    const intent = requestedIntent === "review" ? "review" : "draft";
    const form = new FormData(formElement);
    setState("loading");
    setMessage("");
    const response = await fetch("/api/programs/submit", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        organizationName: form.get("organizationName"),
        programName: form.get("programName"),
        location: form.get("location"),
        sourceUrl: form.get("sourceUrl"),
        summary: form.get("summary"),
        proofKind: form.get("proofKind"),
        proofLabel: form.get("proofLabel"),
        proofUrl: form.get("proofUrl"),
        organizationOwned: form.get("organizationOwned") === "on",
        website: form.get("website"),
        intent,
        startedAt,
      }),
    });
    const result = (await response.json().catch(() => null)) as {
      message?: string;
    } | null;
    setState(response.ok ? "ready" : "blocked");
    setMessage(result?.message ?? "The submission could not be saved.");
    if (!response.ok) return;
    formElement.reset();
    setStartedAt(Date.now());
  }

  return (
    <form className="program-submission-form" onSubmit={submit}>
      <label className="bot-field" aria-hidden="true">
        Website
        <input name="website" tabIndex={-1} autoComplete="off" />
      </label>
      <fieldset>
        <legend>Program identity</legend>
        <div className="form-grid">
          <label>
            Organization name
            <input
              name="organizationName"
              required
              minLength={2}
              maxLength={160}
            />
          </label>
          <label>
            Program name
            <input name="programName" required minLength={4} maxLength={180} />
          </label>
          <label>
            Philippine location
            <input
              name="location"
              required
              minLength={2}
              maxLength={240}
              placeholder="Province, city, or municipality"
            />
          </label>
          <label>
            Official organization or campaign URL
            <input
              name="sourceUrl"
              type="url"
              required
              maxLength={2048}
              placeholder="https://organization.org/campaign"
            />
          </label>
        </div>
        <label>
          Public summary
          <textarea
            name="summary"
            required
            minLength={20}
            maxLength={2000}
            rows={4}
          />
        </label>
      </fieldset>
      <fieldset>
        <legend>First proof item</legend>
        <p>
          Pubmats, posts, websites, video, and news can show that a fundraiser
          exists. Organization registration or representative authorization may
          be requested during review.
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
              maxLength={180}
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
            maxLength={2048}
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
          Public evidence is recorded with a SHA-256 fingerprint. Never put
          private identity, registration, authorization, or payout documents in
          a public link.
        </p>
      </div>
      <div className="submission-actions">
        {mode === "admin" ? (
          <button
            className="secondary-button"
            name="intent"
            value="draft"
            type="submit"
            disabled={state === "loading"}
          >
            Save draft
          </button>
        ) : null}
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
