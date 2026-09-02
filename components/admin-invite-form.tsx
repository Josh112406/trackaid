"use client";

import { FormEvent, useState } from "react";
import { Check, Copy, LoaderCircle, UserPlus } from "lucide-react";

type InvitationResponse = {
  invitationUrl?: string;
  expiresAt?: string;
  message?: string;
};

export function AdminInviteForm() {
  const [busy, setBusy] = useState(false);
  const [copied, setCopied] = useState(false);
  const [message, setMessage] = useState("");
  const [invitation, setInvitation] = useState<InvitationResponse | null>(null);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    setBusy(true);
    setCopied(false);
    setMessage("");
    setInvitation(null);

    const response = await fetch("/api/admin/invitations", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        email: form.get("email"),
        role: form.get("role"),
      }),
    }).catch(() => null);
    const result = response
      ? ((await response.json().catch(() => ({}))) as InvitationResponse)
      : {};
    setBusy(false);

    if (!response?.ok || !result.invitationUrl) {
      setMessage(result.message ?? "The invitation could not be created.");
      return;
    }
    setInvitation(result);
    setMessage("Invitation created. Copy it now; the raw token is not stored.");
  }

  async function copyLink() {
    if (!invitation?.invitationUrl) return;
    try {
      await navigator.clipboard.writeText(invitation.invitationUrl);
      setCopied(true);
      setMessage("Invitation link copied.");
    } catch {
      setMessage("Copy failed. Select the link and copy it manually.");
    }
  }

  return (
    <section className="admin-panel admin-invite-card">
      <div className="panel-heading">
        <div>
          <span>Owner access</span>
          <h3>Create an invitation</h3>
        </div>
        <UserPlus size={24} aria-hidden="true" />
      </div>
      <form className="admin-invite-form" onSubmit={submit}>
        <label>
          Email address
          <input name="email" type="email" autoComplete="email" required />
        </label>
        <label>
          Role
          <select name="role" defaultValue="reviewer" required>
            <option value="reviewer">Reviewer — manage programs and proof</option>
            <option value="auditor">Auditor — read-only oversight</option>
          </select>
        </label>
        <button className="primary-button" disabled={busy} type="submit">
          {busy ? (
            <LoaderCircle className="spin" size={18} aria-hidden="true" />
          ) : (
            <UserPlus size={18} aria-hidden="true" />
          )}
          Generate one-time link
        </button>
      </form>
      {invitation?.invitationUrl ? (
        <div className="admin-invite-result">
          <label>
            Invitation link
            <input value={invitation.invitationUrl} readOnly />
          </label>
          <button className="secondary-button" type="button" onClick={copyLink}>
            {copied ? (
              <Check size={17} aria-hidden="true" />
            ) : (
              <Copy size={17} aria-hidden="true" />
            )}
            {copied ? "Copied" : "Copy link"}
          </button>
          <small>
            Expires in 24 hours and can be used only once by the invited email.
          </small>
        </div>
      ) : null}
      {message ? (
        <p
          className={`form-message form-message-${invitation ? "ready" : "blocked"}`}
          role="status"
        >
          {message}
        </p>
      ) : null}
    </section>
  );
}
