"use client";

import { FormEvent, useEffect, useState } from "react";
import { CheckCircle2, KeyRound, LoaderCircle } from "lucide-react";
import { useRouter } from "next/navigation";

import { createBrowserSupabaseClient } from "@/lib/supabase/browser";

export function AdminSetupForm({
  email,
  invitationToken,
}: {
  email: string;
  invitationToken: string;
}) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");
  const [ready, setReady] = useState(false);

  useEffect(() => {
    if (invitationToken) window.history.replaceState(null, "", "/admin/setup");
  }, [invitationToken]);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const password = String(form.get("password") ?? "");
    const confirmation = String(form.get("confirmation") ?? "");

    if (!invitationToken) {
      setMessage("This setup link is missing its one-time invitation.");
      return;
    }
    if (password.length < 12) {
      setMessage("Use at least 12 characters for your password.");
      return;
    }
    if (password !== confirmation) {
      setMessage("The passwords do not match.");
      return;
    }

    setLoading(true);
    setMessage("");
    const supabase = createBrowserSupabaseClient();
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        emailRedirectTo: `${window.location.origin}/admin/auth/callback?next=/admin`,
        data: { admin_setup_token: invitationToken },
      },
    });
    setLoading(false);

    if (error) {
      setMessage(
        "This invitation is invalid, expired, or already used. Request a new owner invitation.",
      );
      return;
    }

    if (data.session) {
      router.replace("/admin");
      router.refresh();
      return;
    }

    setReady(true);
    setMessage(
      "Account created. Open the confirmation email from Supabase, then sign in.",
    );
  }

  return (
    <form className="admin-login-form" onSubmit={submit}>
      {ready ? (
        <CheckCircle2 size={30} aria-hidden="true" />
      ) : (
        <KeyRound size={30} aria-hidden="true" />
      )}
      <label>
        Owner email
        <input value={email} type="email" autoComplete="email" readOnly />
      </label>
      <label>
        Create password
        <input
          name="password"
          type="password"
          autoComplete="new-password"
          minLength={12}
          required
        />
        <small>
          At least 12 characters. A password manager is recommended.
        </small>
      </label>
      <label>
        Confirm password
        <input
          name="confirmation"
          type="password"
          autoComplete="new-password"
          minLength={12}
          required
        />
      </label>
      <button
        className="primary-button"
        disabled={loading || ready}
        type="submit"
      >
        {loading ? (
          <LoaderCircle className="spin" size={18} aria-hidden="true" />
        ) : null}
        {ready ? "Check your email" : "Create owner account"}
      </button>
      {message ? (
        <p
          className={`form-message form-message-${ready ? "ready" : "blocked"}`}
          role="status"
        >
          {message}
        </p>
      ) : null}
    </form>
  );
}
