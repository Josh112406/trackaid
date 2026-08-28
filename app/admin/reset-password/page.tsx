import type { Metadata } from "next";
import Link from "next/link";

import { AdminPasswordUpdate } from "@/components/admin-password-update";

export const metadata: Metadata = {
  title: "Choose a new TrackAid password",
  robots: { index: false, follow: false },
};

export default function AdminResetPasswordPage() {
  return (
    <main id="main-content" className="admin-login-page">
      <div>
        <span className="eyebrow">Secure password reset</span>
        <h1>Choose a new password.</h1>
        <p>
          Use the recovery link from your email. It expires and can only be used
          for this account.
        </p>
        <Link className="back-link" href="/admin/login">
          Return to sign in
        </Link>
      </div>
      <AdminPasswordUpdate />
    </main>
  );
}
