import type { Metadata } from "next";
import Link from "next/link";

import { AdminPasswordResetRequest } from "@/components/admin-password-reset-request";

export const metadata: Metadata = {
  title: "Reset TrackAid password",
  robots: { index: false, follow: false },
};

export default function AdminForgotPasswordPage() {
  return (
    <main id="main-content" className="admin-login-page">
      <div>
        <span className="eyebrow">Account recovery</span>
        <h1>Reset your password.</h1>
        <p>
          Supabase sends the reset link only to an administrator’s verified
          email address.
        </p>
        <Link className="back-link" href="/admin/login">
          Return to sign in
        </Link>
      </div>
      <AdminPasswordResetRequest />
    </main>
  );
}
