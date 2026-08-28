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
      <Link className="back-link" href="/admin#programs">
        <ArrowLeft size={17} aria-hidden="true" /> Back to review queue
      </Link>
      <div className="admin-form-intro">
        <span className="eyebrow">Manual fundraising program</span>
        <h1>Add the claim. Then prove it.</h1>
        <p>
          Create a draft from an official organization-owned page and attach
          public campaign evidence. Approval remains separate from submission.
        </p>
      </div>
      {access.mode === "preview" ? (
        <div className="admin-preview-banner">
          <CirclePreview />
          <div>
            <strong>Preview mode</strong>
            <p>
              The form demonstrates the workflow but will not save until
              protected Supabase administration is enabled.
            </p>
          </div>
        </div>
      ) : null}
      <ProgramSubmissionForm />
    </main>
  );
}

function CirclePreview() {
  return <span className="preview-dot" aria-hidden="true" />;
}
