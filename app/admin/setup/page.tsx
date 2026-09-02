import type { Metadata } from "next";
import Link from "next/link";

import { AdminSetupForm } from "@/components/admin-setup-form";
import { emailAddress } from "@/lib/validation";

export const metadata: Metadata = {
  title: "Set up TrackAid administrator account",
  robots: { index: false, follow: false },
};

export default async function AdminSetupPage({
  searchParams,
}: {
  searchParams: Promise<{ email?: string; token?: string }>;
}) {
  const { email, token = "" } = await searchParams;
  let invitedEmail = "";
  try {
    invitedEmail = emailAddress(email);
  } catch {
    /* The form presents the same invalid-invitation message for every failure. */
  }

  return (
    <main id="main-content" className="admin-login-page">
      <div>
        <span className="eyebrow">One-time administrator invitation</span>
        <h1>Create your private admin account.</h1>
        <p>
          Choose the password here. TrackAid and this conversation never receive
          or store the plaintext password.
        </p>
        <Link className="back-link" href="/admin/login">
          Return to sign in
        </Link>
      </div>
      <AdminSetupForm email={invitedEmail} invitationToken={token} />
    </main>
  );
}
