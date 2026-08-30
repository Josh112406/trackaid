"use client";

import { FormEvent, useState } from "react";
import { LoaderCircle, LockKeyhole } from "lucide-react";
import { useRouter } from "next/navigation";
import Link from "next/link";

export function AdminLoginForm() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");
  const [startedAt] = useState(() => Date.now());

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    setLoading(true);
    const response = await fetch("/api/auth/admin-login", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        email: form.get("email"),
        password: form.get("password"),
        website: form.get("website"),
        startedAt,
      }),
    });
    const result = (await response.json().catch(() => null)) as {
      message?: string;
    } | null;
    setLoading(false);
    if (!response.ok) {
      setMessage(result?.message ?? "The email or password is incorrect.");
      return;
    }
    router.replace("/admin");
    router.refresh();
  }

  return (
    <form className="admin-login-form" onSubmit={submit}>
      <label className="bot-field" aria-hidden="true">
        Website
        <input name="website" tabIndex={-1} autoComplete="off" />
      </label>
      <LockKeyhole size={30} aria-hidden="true" />
      <label>
        Email
        <input
          name="email"
          type="email"
          autoComplete="email"
          maxLength={254}
          required
        />
      </label>
      <label>
        Password
        <input
          name="password"
          type="password"
          autoComplete="current-password"
          minLength={12}
          maxLength={200}
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
