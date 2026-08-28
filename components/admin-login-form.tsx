"use client";

import { FormEvent, useState } from "react";
import { LoaderCircle, LockKeyhole } from "lucide-react";
import { useRouter } from "next/navigation";
import Link from "next/link";

import { createBrowserSupabaseClient } from "@/lib/supabase/browser";

export function AdminLoginForm() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const supabase = createBrowserSupabaseClient();
    setLoading(true);
    const { error } = await supabase.auth.signInWithPassword({
      email: String(form.get("email") ?? ""),
      password: String(form.get("password") ?? ""),
    });
    setLoading(false);
    if (error) {
      setMessage("The email or password is incorrect.");
      return;
    }
    router.replace("/admin");
    router.refresh();
  }

  return (
    <form className="admin-login-form" onSubmit={submit}>
      <LockKeyhole size={30} aria-hidden="true" />
      <label>
        Email
        <input name="email" type="email" autoComplete="email" required />
      </label>
      <label>
        Password
        <input
          name="password"
          type="password"
          autoComplete="current-password"
          required
        />
      </label>
      <button className="primary-button" disabled={loading} type="submit">
        {loading ? (
          <LoaderCircle className="spin" size={18} aria-hidden="true" />
        ) : null}
        Sign in securely
      </button>
      <Link className="text-link" href="/admin/forgot-password">
        Forgot your password?
      </Link>
      {message ? (
        <p className="form-message form-message-blocked" role="status">
          {message}
        </p>
      ) : null}
    </form>
  );
}
