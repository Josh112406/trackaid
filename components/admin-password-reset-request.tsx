"use client";

import { FormEvent, useState } from "react";
import { LoaderCircle, MailCheck } from "lucide-react";

import { createBrowserSupabaseClient } from "@/lib/supabase/browser";

export function AdminPasswordResetRequest() {
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const email = String(new FormData(event.currentTarget).get("email") ?? "");
    setLoading(true);
    const { error } =
      await createBrowserSupabaseClient().auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/admin/auth/callback?next=/admin/reset-password`,
      });
    setLoading(false);
    setMessage(
      error
        ? "The reset request could not be sent. Wait a moment and try again."
        : "If that email belongs to an administrator, Supabase has sent a secure reset link.",
    );
  }

  return (
    <form className="admin-login-form" onSubmit={submit}>
      <MailCheck size={30} aria-hidden="true" />
      <label>
        Administrator email
        <input name="email" type="email" autoComplete="email" required />
      </label>
      <button className="primary-button" disabled={loading} type="submit">
        {loading ? (
          <LoaderCircle className="spin" size={18} aria-hidden="true" />
        ) : null}
        Send reset link
      </button>
      {message ? (
        <p className="form-message form-message-ready" role="status">
          {message}
        </p>
      ) : null}
    </form>
  );
}
