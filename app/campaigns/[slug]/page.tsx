import Link from "next/link";
import {
  ArrowLeft,
  CircleAlert,
  Landmark,
  MapPin,
  ShieldCheck,
} from "lucide-react";
import { notFound } from "next/navigation";

import { AuditTimeline } from "@/components/audit-timeline";
import { DonationReadiness } from "@/components/donation-readiness";
import { demoCampaigns } from "@/lib/demo-data";
import { formatPhp, percentOf } from "@/lib/format";

export default async function CampaignPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const campaign = demoCampaigns.find((item) => item.slug === slug);
  if (!campaign) notFound();

  const progress = percentOf(
    campaign.receivedCentavos,
    campaign.fundingGoalCentavos,
  );

  return (
    <main id="main-content" className="campaign-page">
      <Link className="back-link" href="/campaigns">
        <ArrowLeft size={17} aria-hidden="true" /> Back to campaigns
      </Link>
      <section className="campaign-hero">
        <div>
          <span className="demo-label">
            Demonstration campaign · no live donations
          </span>
          <h1>{campaign.title}</h1>
          <p className="campaign-summary">{campaign.summary}</p>
          <div className="campaign-facts">
            <span>
              <MapPin size={18} aria-hidden="true" /> {campaign.location}
            </span>
            <span>
              <ShieldCheck size={18} aria-hidden="true" />{" "}
              {campaign.organization}
            </span>
            <span>
              <Landmark size={18} aria-hidden="true" /> Registered account check
              demonstrated
            </span>
          </div>
        </div>
        <div className="campaign-totals">
          <span>Test donations recorded</span>
          <strong>{formatPhp(campaign.receivedCentavos)}</strong>
          <p>of {formatPhp(campaign.fundingGoalCentavos)} demonstration goal</p>
          <div
            className="progress-track"
            role="progressbar"
            aria-label={`${progress}% funded`}
            aria-valuenow={progress}
            aria-valuemin={0}
            aria-valuemax={100}
          >
            <span style={{ width: `${progress}%` }} />
          </div>
          <dl>
            <div>
              <dt>Logged disbursements</dt>
              <dd>{formatPhp(campaign.disbursedCentavos)}</dd>
            </div>
            <div>
              <dt>Unallocated demonstration balance</dt>
              <dd>
                {formatPhp(
                  campaign.receivedCentavos - campaign.disbursedCentavos,
                )}
              </dd>
            </div>
          </dl>
        </div>
      </section>

      <div className="campaign-content-grid">
        <section
          className="campaign-audit"
          aria-labelledby="campaign-audit-title"
        >
          <div className="section-heading compact-heading">
            <div>
              <span className="eyebrow">Public record</span>
              <h2 id="campaign-audit-title">Audit trail</h2>
            </div>
          </div>
          <div className="evidence-notice">
            <CircleAlert size={20} aria-hidden="true" />
            <p>
              A confirmed ledger entry proves the record has not changed since
              anchoring. Independent beneficiary and supplier confirmations
              provide evidence about the real-world event.
            </p>
          </div>
          <AuditTimeline events={campaign.events} />
        </section>
        <aside>
          <DonationReadiness campaignId={campaign.id} />
          <div className="aside-card">
            <h2>Target beneficiaries</h2>
            <p>{campaign.targetBeneficiaries}</p>
            <h3>Evidence privacy</h3>
            <p>
              Receipts and permit files remain in private storage. The public
              record contains redacted descriptions and cryptographic hashes for
              integrity checks.
            </p>
          </div>
        </aside>
      </div>
    </main>
  );
}
