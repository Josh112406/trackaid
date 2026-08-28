import Link from "next/link";
import {
  ArrowRight,
  BadgeCheck,
  BanknoteArrowDown,
  FileLock2,
  ScanSearch,
} from "lucide-react";
import { CampaignCard } from "@/components/campaign-card";
import { OfficialCampaignCard } from "@/components/official-campaign-card";
import { loadPublishedCampaigns } from "@/lib/campaigns";
import { loadOfficialCampaignSources } from "@/lib/official-sources";

export const revalidate = 300;

export default async function HomePage() {
  const [campaigns, sources] = await Promise.all([
    loadPublishedCampaigns(),
    loadOfficialCampaignSources(),
  ]);
  return (
    <main id="main-content">
      <section className="hero">
        <div className="hero-copy">
          <span className="demo-label">Public relief ledger</span>
          <h1>Disaster relief people can follow, peso by peso.</h1>
          <p className="hero-lede">
            TrackAid connects Philippine payment rails to a public record of
            donations, disbursements, evidence, and independent confirmations.
          </p>
          <div className="hero-actions">
            <Link className="primary-button" href="/campaigns">
              View campaigns <ArrowRight size={18} />
            </Link>
            <Link className="secondary-button" href="/how-it-works">
              How verification works
            </Link>
          </div>
          <p className="safety-note">
            Only verified, published campaigns can accept on-platform donations.
            External appeals always open on the organization’s official site.
          </p>
        </div>
        <div className="hero-ledger" aria-label="TrackAid audit flow">
          <div className="ledger-card ledger-card-main">
            <span>Payment</span>
            <strong>PHP</strong>
            <p>Processed through PayMongo</p>
          </div>
          <div className="ledger-stem" />
          <div className="ledger-split">
            <div className="ledger-card">
              <span>Evidence</span>
              <strong>SHA-256</strong>
            </div>
            <div className="ledger-card">
              <span>Public record</span>
              <strong>Auditable</strong>
            </div>
          </div>
          <div className="ledger-seal">
            <BadgeCheck size={20} /> Sensitive files remain private
          </div>
        </div>
      </section>
      <section className="trust-strip">
        <div>
          <BanknoteArrowDown size={22} />
          <span>Money stays in Philippine pesos</span>
        </div>
        <div>
          <FileLock2 size={22} />
          <span>Sensitive evidence stays private</span>
        </div>
        <div>
          <ScanSearch size={22} />
          <span>Hashes and totals stay publicly auditable</span>
        </div>
      </section>
      <section className="section-shell">
        <div className="section-heading">
          <div>
            <span className="eyebrow">TrackAid campaigns</span>
            <h2>Follow the full record, not just a fundraising total.</h2>
          </div>
          <p>Campaigns appear here only after organization and proof review.</p>
        </div>
        {campaigns.length ? (
          <div className="campaign-grid">
            {campaigns.slice(0, 2).map((c) => (
              <CampaignCard key={c.id} campaign={c} />
            ))}
          </div>
        ) : (
          <div className="empty-state">
            <BadgeCheck size={28} />
            <h3>No on-platform campaign is published yet.</h3>
            <p>
              The directory will open when the first organization completes
              verification.
            </p>
            <Link className="text-link" href="/organizations">
              Read the approval requirements <ArrowRight size={16} />
            </Link>
          </div>
        )}
      </section>
      <section className="official-campaigns-section">
        <div className="section-heading">
          <div>
            <span className="eyebrow">Official sources</span>
            <h2>Fundraisers checked at their source.</h2>
          </div>
          <p>
            These links open organization-owned donation pages. Their payments
            are not recorded as TrackAid transactions.
          </p>
        </div>
        <div className="official-campaign-grid">
          {sources.slice(0, 3).map((s) => (
            <OfficialCampaignCard key={s.slug} source={s} />
          ))}
        </div>
        <Link className="directory-home-link" href="/official-sources">
          View all official sources <ArrowRight size={17} />
        </Link>
      </section>
    </main>
  );
}
