import Link from "next/link";

import { AdminLoginForm } from "@/components/admin-login-form";

export default function AdminLoginPage() {
  return (
    <main id="main-content" className="admin-login-page">
      <div>
        <span className="eyebrow">Private administration</span>
        <h1>Sign in to TrackAid.</h1>
        <p>
          Only invited owners, reviewers, and auditors may access live
          submissions, evidence, and transaction records.
        </p>
        <Link className="back-link" href="/">
          Return to public site
        </Link>
      </div>
      <AdminLoginForm />
    </main>
  );
}
