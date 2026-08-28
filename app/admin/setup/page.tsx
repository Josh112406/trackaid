import type { Metadata } from "next";
import Link from "next/link";

import { AdminSetupForm } from "@/components/admin-setup-form";

export const metadata: Metadata = {
  title: "Set up TrackAid owner account",
  robots: { index: false, follow: false },
};

export default async function AdminSetupPage({
  searchParams,
}: {
  searchParams: Promise<{ token?: string }>;
}) {
  const { token = "" } = await searchParams;

  return (
    <main id="main-content" className="admin-login-page">
      <div>
        <span className="eyebrow">One-time owner invitation</span>
        <h1>Create your private admin account.</h1>
        <p>
          Choose the password here. TrackAid and this conversation never receive
          or store the plaintext password.
        </p>
        <Link className="back-link" href="/admin/login">
          Return to sign in
        </Link>
      </div>
      <AdminSetupForm email="quibaljosh@gmail.com" invitationToken={token} />
    </main>
  );
}
