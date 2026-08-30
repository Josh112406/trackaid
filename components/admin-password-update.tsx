"use client";

import { FormEvent, useState } from "react";
import { KeyRound, LoaderCircle } from "lucide-react";
import { useRouter } from "next/navigation";

import { createBrowserSupabaseClient } from "@/lib/supabase/browser";
import { strongPassword } from "@/lib/validation";

export function AdminPasswordUpdate() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const password = String(form.get("password") ?? "");
    const confirmation = String(form.get("confirmation") ?? "");
    try {
      strongPassword(password);
    } catch (error) {
      return setMessage((error as Error).message);
    }
    if (password !== confirmation)
      return setMessage("The passwords do not match.");

    setLoading(true);
    const { error } = await createBrowserSupabaseClient().auth.updateUser({
      password,
    });
    setLoading(false);
    if (error)
      return setMessage(
        "The reset link is invalid or expired. Request a new one.",
      );
    router.replace("/admin");
    router.refresh();
  }

  return (
    <form className="admin-login-form" onSubmit={submit}>
      <KeyRound size={30} aria-hidden="true" />
      <label>
        New password
        <input
          name="password"
          type="password"
          autoComplete="new-password"
          minLength={12}
          required
        />
        <small>
          12–200 characters with lowercase, uppercase, a number, and a symbol.
        </small>
      </label>
      <label>
        Confirm new password
        <input
          name="confirmation"
          type="password"
          autoComplete="new-password"
          minLength={12}
          required
        />
      </label>
      <button className="primary-button" disabled={loading} type="submit">
        {loading ? (
          <LoaderCircle className="spin" size={18} aria-hidden="true" />
        ) : null}
        Save new password
      </button>
      {message ? (
        <p className="form-message form-message-blocked" role="status">
          {message}
        </p>
      ) : null}
    </form>
  );
}
