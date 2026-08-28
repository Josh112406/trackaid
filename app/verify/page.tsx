import {
  BadgeCheck,
  Building2,
  FileCheck2,
  Landmark,
  MailCheck,
} from "lucide-react";

import { OrganizationVerificationForm } from "@/components/organization-verification-form";

export default function VerifyOrganizationPage() {
  return (
    <main id="main-content" className="verify-page">
      <section className="verify-intro">
        <span className="demo-label">Organization verification</span>
        <h1>Campaign access begins with organization verification.</h1>
        <p>
          TrackAid does not approve organizations from an email address alone.
          An administrator reviews identity, authority, permit, and bank-account
          evidence before campaign creation is enabled.
        </p>
      </section>

      <section
        className="verification-steps"
        aria-label="Organization verification steps"
      >
        <article>
          <span>01</span>
          <MailCheck size={28} aria-hidden="true" />
          <h2>Official account</h2>
          <p>
            Confirm an organization-controlled email domain and a named
            accountable officer.
          </p>
        </article>
        <article>
          <span>02</span>
          <FileCheck2 size={28} aria-hidden="true" />
          <h2>Authority documents</h2>
          <p>
            Upload current permits and authority letters to private,
            access-controlled storage.
          </p>
        </article>
        <article>
          <span>03</span>
          <Landmark size={28} aria-hidden="true" />
          <h2>Bank ownership</h2>
          <p>
            Match the settlement account name to the verified organization,
            never a personal account.
          </p>
        </article>
        <article>
          <span>04</span>
          <BadgeCheck size={28} aria-hidden="true" />
          <h2>Human review</h2>
          <p>
            Record the reviewer, decision, reason, and review time before adding
            the organization.
          </p>
        </article>
      </section>

      <section className="verification-form-shell">
        <div>
          <div className="verification-form-marker">
            <span className="verification-form-marker-icon">
              <Building2 size={24} strokeWidth={1.8} aria-hidden="true" />
            </span>
            <span className="eyebrow">Private application</span>
          </div>
          <h2>Organization details</h2>
          <p>
            Signed-in owners and reviewers can submit organization details and
            authority evidence directly to Supabase for review.
          </p>
        </div>
        <OrganizationVerificationForm />
      </section>
    </main>
  );
}
