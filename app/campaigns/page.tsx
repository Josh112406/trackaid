import type { Metadata } from "next";
import Link from "next/link";
import { ArrowLeft, ArrowRight, CircleAlert } from "lucide-react";

import { CampaignCard } from "@/components/campaign-card";
import { OfficialCampaignCard } from "@/components/official-campaign-card";
import { demoCampaigns } from "@/lib/demo-data";
import { loadOfficialCampaignSources } from "@/lib/official-sources";

export const metadata: Metadata = {
  title: "Campaigns | TrackAid",
  description:
    "Browse TrackAid demonstration audit trails and verified official donation routes for Philippine relief work.",
};

export const revalidate = 300;

export default async function CampaignDirectoryPage() {
  const officialSources = await loadOfficialCampaignSources();

  return (
    <main id="main-content" className="campaign-directory-page">
      <section className="campaign-directory-intro">
        <Link className="back-link" href="/">
          <ArrowLeft size={17} aria-hidden="true" /> Back to TrackAid
        </Link>
        <div className="campaign-directory-heading">
          <div>
            <span className="demo-label">Campaign directory</span>
            <h1>Follow the money—or donate at the official source.</h1>
          </div>
          <p>
            TrackAid demonstrations explain the public audit trail. Official
            listings send you to the organization’s own donation page and are
            monitored separately.
          </p>
        </div>
        <div className="directory-safety-note">
          <CircleAlert size={21} aria-hidden="true" />
          <p>
            TrackAid does not accept live donations in this prototype. Never
            send money to a demonstration campaign.
          </p>
        </div>
      </section>

      <section
        className="campaign-directory-section"
        aria-labelledby="trackaid-campaigns-title"
      >
        <div className="section-heading">
          <div>
            <span className="eyebrow">TrackAid audit demonstrations</span>
            <h2 id="trackaid-campaigns-title">
              See how each peso is recorded.
            </h2>
          </div>
          <p>
            These sample records contain no real donations. Open a campaign to
            inspect its evidence, transaction identifiers, and confirmations.
          </p>
        </div>
        <div className="campaign-grid">
          {demoCampaigns.map((campaign) => (
            <CampaignCard campaign={campaign} key={campaign.id} />
          ))}
        </div>
      </section>

      <section
        className="official-campaigns-section campaign-directory-official"
        id="official"
        aria-labelledby="official-campaigns-title"
      >
        <div className="section-heading">
          <div>
            <span className="eyebrow">Organization-owned donation pages</span>
            <h2 id="official-campaigns-title">
              Donate only on the official site.
            </h2>
          </div>
          <p>
            Source checks run every six hours. Payments happen outside TrackAid
            and remain the responsibility of the listed organization.
          </p>
        </div>
        <div className="official-campaign-grid">
          {officialSources.map((source) => (
            <OfficialCampaignCard source={source} key={source.slug} />
          ))}
        </div>
        <Link className="directory-home-link" href="/#audit">
          Continue to the public audit explanation
          <ArrowRight size={17} aria-hidden="true" />
        </Link>
      </section>
    </main>
  );
}
