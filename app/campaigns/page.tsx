import type { Metadata } from "next";
import Link from "next/link";
import { ArrowLeft, BadgeCheck } from "lucide-react";
import { CampaignCard } from "@/components/campaign-card";
import { OfficialCampaignCard } from "@/components/official-campaign-card";
import { loadPublishedCampaigns } from "@/lib/campaigns";
import { loadOfficialCampaignSources } from "@/lib/official-sources";

export const metadata: Metadata = {
  title: "Campaigns | TrackAid",
  description:
    "Browse verified TrackAid relief campaigns and their public audit trails.",
};
export const revalidate = 60;

export default async function CampaignDirectoryPage() {
  const [campaigns, sources] = await Promise.all([
    loadPublishedCampaigns(),
    loadOfficialCampaignSources(),
  ]);
  return (
    <main id="main-content" className="campaign-directory-page">
      <section className="campaign-directory-intro">
        <Link className="back-link" href="/">
          <ArrowLeft size={17} /> Back to TrackAid
        </Link>
        <div className="campaign-directory-heading">
          <div>
            <span className="section-label">Campaign directory</span>
            <h1>Fund relief. Follow the record.</h1>
          </div>
          <p>
            Every listed campaign belongs to a verified organization and
            publishes its on-platform money trail.
          </p>
        </div>
        <Link
          className="primary-button campaign-submit-link"
          href="/submit-program"
        >
          Submit a program
        </Link>
      </section>
      <section className="campaign-directory-section">
        <div className="section-heading">
          <div>
            <span className="eyebrow">Verified programs</span>
            <h2>Open campaigns</h2>
          </div>
          <p>
            PayMongo payments are recorded after signed webhook verification.
          </p>
        </div>
        {campaigns.length ? (
          <div className="campaign-grid">
            {campaigns.map((c) => (
              <CampaignCard key={c.id} campaign={c} />
            ))}
          </div>
        ) : (
          <div className="empty-state">
            <BadgeCheck size={28} />
            <h3>No campaign is accepting TrackAid donations yet.</h3>
            <p>
              Approval requires organization authority, proof, and a reviewed
              payout account.
            </p>
            <Link className="text-link" href="/official-sources">
              Browse official organization sources
            </Link>
            <Link className="text-link" href="/submit-program">
              Submit a program for review
            </Link>
          </div>
        )}
      </section>
      <section className="campaign-directory-section">
        <div className="section-heading">
          <div>
            <span className="eyebrow">Approved official sources</span>
            <h2>Programs hosted by verified organizations</h2>
          </div>
          <p>
            These programs were reviewed by TrackAid and open on their official
            organization-owned pages.
          </p>
        </div>
        <div className="official-campaign-grid">
          {sources.map((source) => (
            <OfficialCampaignCard key={source.slug} source={source} />
          ))}
        </div>
      </section>
    </main>
  );
}
