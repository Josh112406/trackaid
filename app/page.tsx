import Link from "next/link";
import {
  ArrowRight,
  BadgeCheck,
  BanknoteArrowDown,
  FileLock2,
  HandCoins,
  MessageSquareCheck,
  ScanSearch,
} from "lucide-react";

import { AuditTimeline } from "@/components/audit-timeline";
import { CampaignCard } from "@/components/campaign-card";
import { OfficialCampaignCard } from "@/components/official-campaign-card";
import { demoCampaigns } from "@/lib/demo-data";
import { formatPhp } from "@/lib/format";
import { loadOfficialCampaignSources } from "@/lib/official-sources";

export const revalidate = 300;

export default async function HomePage() {
  const campaign = demoCampaigns[0];
  const officialCampaignSources = await loadOfficialCampaignSources();

  return (
    <main id="main-content">
      <section className="hero">
        <div className="hero-copy">
          <span className="demo-label">Working MVP · demonstration data</span>
          <h1>Disaster relief people can follow, peso by peso.</h1>
          <p className="hero-lede">
            TrackAid connects familiar Philippine payment rails to a public,
            tamper-evident record of donations, disbursements, evidence, and
            independent confirmations.
          </p>
          <div className="hero-actions">
            <Link className="primary-button" href="/campaigns">
              View campaigns <ArrowRight size={18} aria-hidden="true" />
            </Link>
            <Link className="secondary-button" href="#how-it-works">
              See how verification works
            </Link>
          </div>
          <p className="safety-note">
            This prototype does not accept live donations and does not represent
            any real campaign.
          </p>
        </div>
        <div className="hero-ledger" aria-label="Example fund flow">
          <div className="ledger-card ledger-card-main">
            <span>Demonstration campaign</span>
            <strong>{formatPhp(campaign.receivedCentavos)}</strong>
            <p>test donations recorded</p>
          </div>
          <div className="ledger-stem" aria-hidden="true" />
          <div className="ledger-split">
            <div className="ledger-card">
              <span>Logged disbursements</span>
              <strong>{formatPhp(campaign.disbursedCentavos)}</strong>
            </div>
            <div className="ledger-card">
              <span>Public confirmations</span>
              <strong>2 types</strong>
            </div>
          </div>
          <div className="ledger-seal">
            <BadgeCheck size={20} aria-hidden="true" /> Anchored on a test
            network
          </div>
        </div>
      </section>

      <section className="trust-strip" aria-label="TrackAid principles">
        <div>
          <BanknoteArrowDown size={22} aria-hidden="true" />
          <span>Money stays in Philippine pesos</span>
        </div>
        <div>
          <FileLock2 size={22} aria-hidden="true" />
          <span>Sensitive evidence stays private</span>
        </div>
        <div>
          <ScanSearch size={22} aria-hidden="true" />
          <span>Hashes and totals stay publicly auditable</span>
        </div>
      </section>

      <section className="section-shell" id="campaigns">
        <div className="section-heading">
          <div>
            <span className="eyebrow">Campaign demonstrations</span>
            <h2>Follow the full record, not just the fundraising total.</h2>
          </div>
          <p>
            These records are intentionally labeled demonstrations. They show
            the proposed experience without presenting sample activity as real
            relief work.
          </p>
        </div>
        <div className="campaign-grid">
          {demoCampaigns.map((item) => (
            <CampaignCard campaign={item} key={item.id} />
          ))}
        </div>
      </section>

      <section className="official-campaigns-section" id="official-campaigns">
        <div className="section-heading">
          <div>
            <span className="eyebrow">Live official sources</span>
            <h2>Fundraisers checked at their source.</h2>
          </div>
          <p>
            These listings come from organization-owned pages found and checked
            with Firecrawl. Donation buttons open the organization’s own
            website; TrackAid never presents those external payments as TrackAid
            transactions.
          </p>
        </div>
        <div className="official-campaign-grid">
          {officialCampaignSources.map((source) => (
            <OfficialCampaignCard key={source.slug} source={source} />
          ))}
        </div>
      </section>

      <section className="how-section" id="how-it-works">
        <div className="section-heading">
          <div>
            <span className="eyebrow">How TrackAid works</span>
            <h2>Trust is built in layers.</h2>
          </div>
          <p>
            A blockchain record proves that a digital statement has not been
            changed. It does not prove that a receipt is truthful or that goods
            reached a person, so TrackAid adds verification at each real-world
            boundary.
          </p>
        </div>
        <ol className="how-grid">
          <li>
            <span>01</span>
            <BadgeCheck size={28} aria-hidden="true" />
            <h3>Verify organizations</h3>
            <p>
              Review official domains, permits, and registered organization bank
              details.
            </p>
          </li>
          <li>
            <span>02</span>
            <HandCoins size={28} aria-hidden="true" />
            <h3>Reconcile payments</h3>
            <p>
              Accept pesos through PayMongo and record only verified, idempotent
              webhook events.
            </p>
          </li>
          <li>
            <span>03</span>
            <FileLock2 size={28} aria-hidden="true" />
            <h3>Hash evidence</h3>
            <p>
              Keep personal data private while publishing the evidence hash and
              redacted description.
            </p>
          </li>
          <li>
            <span>04</span>
            <MessageSquareCheck size={28} aria-hidden="true" />
            <h3>Collect confirmations</h3>
            <p>
              Invite beneficiaries and suppliers to confirm or dispute a logged
              disbursement.
            </p>
          </li>
        </ol>
      </section>

      <section className="audit-preview section-shell" id="audit">
        <div className="section-heading">
          <div>
            <span className="eyebrow">Public audit preview</span>
            <h2>The receipt thread.</h2>
          </div>
          <p>
            Every entry shows what happened, who still needs to confirm it, and
            which proof can be independently checked.
          </p>
        </div>
        <AuditTimeline events={campaign.events} />
      </section>

      <section className="closing-cta">
        <div>
          <span className="eyebrow">For relief organizations and LGUs</span>
          <h2>Start with verification, not a wallet.</h2>
          <p>
            Organizations use familiar sign-in and payment tools. Blockchain
            recording runs behind the service and never asks donors to hold
            cryptocurrency.
          </p>
        </div>
        <Link className="primary-button" href="/verify">
          Review the verification flow{" "}
          <ArrowRight size={18} aria-hidden="true" />
        </Link>
      </section>
    </main>
  );
}
