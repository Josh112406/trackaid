import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { redirect } from "next/navigation";

import { ProgramSubmissionForm } from "@/components/program-submission-form";
import { getAdminAccess } from "@/lib/admin-auth";

export default async function NewProgramSubmissionPage() {
  const access = await getAdminAccess();
  if (access.mode === "unauthorized") redirect("/admin/login");

  return (
    <main id="main-content" className="admin-form-page">
      <Link className="back-link" href="/admin/programs">
        <ArrowLeft size={17} aria-hidden="true" /> Back to review queue
      </Link>
      <div className="admin-form-intro">
        <span className="eyebrow">Manual fundraising program</span>
        <h1>Add the claim. Then prove it.</h1>
        <p>
          Create a program from an official organization-owned page and attach
          public campaign evidence. A different owner or reviewer must make the
          final decision before publication.
        </p>
      </div>
      <ProgramSubmissionForm mode="admin" />
    </main>
  );
}
