import type { Metadata } from "next";
import Link from "next/link";
import { ArrowLeft, BadgeCheck, FileCheck2, ShieldCheck } from "lucide-react";

import { ProgramSubmissionForm } from "@/components/program-submission-form";
import {
  ProgramSubmitterAccount,
  ProgramSubmitterSignIn,
} from "@/components/program-submitter-access";
import { createServerUserClient } from "@/lib/supabase/server";

export const metadata: Metadata = {
  title: "Submit a program | TrackAid",
  description:
    "Submit an organization-owned fundraising program and public proof for TrackAid review.",
};

export const dynamic = "force-dynamic";

export default async function SubmitProgramPage() {
  const supabase = await createServerUserClient();
  const { data } = await supabase.auth.getUser();
  const user = data.user;

  return (
    <main id="main-content" className="program-submit-page">
      <Link className="back-link" href="/campaigns">
        <ArrowLeft size={17} /> Back to campaigns
      </Link>
      <section className="program-submit-intro">
        <div>
          <span className="eyebrow">Program submissions</span>
          <h1>Submit a fundraiser from its official source.</h1>
          <p>
            Organization representatives and community members can send a
            program for review. Submission does not guarantee publication or
            permission to accept donations through TrackAid.
          </p>
        </div>
        <div
          className="program-submit-principles"
          aria-label="Review principles"
        >
          <div>
            <ShieldCheck size={21} />
            <span>Every approval is recorded in the audit log</span>
          </div>
          <div>
            <FileCheck2 size={21} />
            <span>Every submission needs a public proof link</span>
          </div>
          <div>
            <BadgeCheck size={21} />
            <span>TrackAid records the final reviewer and decision</span>
          </div>
        </div>
      </section>
      {user ? (
        <section className="program-submit-form-shell">
          <ProgramSubmitterAccount
            email={user.email ?? "Signed-in submitter"}
          />
          <ProgramSubmissionForm mode="public" />
        </section>
      ) : (
        <ProgramSubmitterSignIn />
      )}
    </main>
  );
}
