"use client";

import Link from "next/link";
import { FormEvent, useState } from "react";
import { CircleAlert, LoaderCircle, LogOut, MailCheck } from "lucide-react";

import { createBrowserSupabaseClient } from "@/lib/supabase/browser";

export function ProgramSubmitterSignIn() {
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const [startedAt] = useState(() => Date.now());

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true);
    setMessage("");
    const form = new FormData(event.currentTarget);
    const email = String(form.get("email") ?? "").trim();
    const response = await fetch("/api/auth/program-link", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        email,
        website: form.get("website"),
        startedAt,
      }),
    });
    const result = (await response.json().catch(() => null)) as {
      message?: string;
    } | null;
    setMessage(
      response.ok
        ? "Check your email for a secure sign-in link, then return to submit your program."
        : (result?.message ?? "The sign-in link could not be sent."),
    );
    setBusy(false);
  }

  return (
    <form className="program-access-card" onSubmit={submit}>
      <label className="bot-field" aria-hidden="true">
        Website
        <input name="website" tabIndex={-1} autoComplete="off" />
      </label>
      <span className="program-access-icon" aria-hidden="true">
        <MailCheck size={24} />
      </span>
      <h2>Sign in to submit</h2>
      <p>
        Use an email address you can verify. TrackAid uses it to identify the
        submitter and contact you if reviewers need more information.
      </p>
      <label>
        Email address
        <input
          name="email"
          type="email"
          autoComplete="email"
          maxLength={254}
          required
        />
      </label>
      <button className="primary-button" type="submit" disabled={busy}>
        {busy ? (
          <LoaderCircle className="spin" size={18} />
        ) : (
          <MailCheck size={18} />
        )}
        Email me a sign-in link
      </button>
      {message ? (
        <p className="form-message form-message-neutral" role="status">
          {message.includes("Check your email") ? null : (
            <CircleAlert size={17} />
          )}
          {message}
        </p>
      ) : null}
      <small>
        TrackAid administrators use a separate protected area. Programs must be
        reviewed before publication.
      </small>
      <Link className="text-link" href="/organizations">
        Read the verification requirements
      </Link>
    </form>
  );
}

export function ProgramSubmitterAccount({ email }: { email: string }) {
  const [busy, setBusy] = useState(false);

  async function signOut() {
    setBusy(true);
    await createBrowserSupabaseClient().auth.signOut();
    window.location.reload();
  }

  return (
    <div className="program-account-bar">
      <div>
        <span>Submitting as</span>
        <strong>{email}</strong>
      </div>
      <button type="button" onClick={signOut} disabled={busy}>
        <LogOut size={16} /> {busy ? "Signing out…" : "Use another account"}
      </button>
    </div>
  );
}
