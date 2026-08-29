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
import { DonationCheckout } from "@/components/donation-checkout";
import { loadCampaignBySlug } from "@/lib/campaigns";
import { formatPhp, percentOf } from "@/lib/format";

export default async function CampaignPage({
  params,
  searchParams,
}: {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ checkout?: string }>;
}) {
  const [{ slug }, query] = await Promise.all([params, searchParams]);
  const campaign = await loadCampaignBySlug(slug);
  if (!campaign) notFound();
  const progress = percentOf(
    campaign.receivedCentavos,
    campaign.fundingGoalCentavos,
  );
  return (
    <main id="main-content" className="campaign-page">
      <Link className="back-link" href="/campaigns">
        <ArrowLeft size={17} /> Back to campaigns
      </Link>
      {query.checkout === "success" ? (
        <div className="checkout-banner checkout-success">
          <ShieldCheck size={19} />
          <p>
            PayMongo accepted the checkout. The donation appears after TrackAid
            verifies the signed payment webhook.
          </p>
        </div>
      ) : null}
      {query.checkout === "cancelled" ? (
        <div className="checkout-banner">
          <CircleAlert size={19} />
          <p>
            Checkout was closed. No payment is recorded unless PayMongo confirms
            it.
          </p>
        </div>
      ) : null}
      <section className="campaign-hero">
        <div>
          <span className="demo-label">Verified relief campaign</span>
          <h1>{campaign.title}</h1>
          <p className="campaign-summary">{campaign.summary}</p>
          <div className="campaign-facts">
            <span>
              <MapPin size={18} />
              {campaign.location}
            </span>
            <span>
              <ShieldCheck size={18} />
              {campaign.organization}
            </span>
            <span>
              <Landmark size={18} />
              Registered payout account reviewed
            </span>
          </div>
        </div>
        <div className="campaign-totals">
          <span>Donations recorded</span>
          <strong>{formatPhp(campaign.receivedCentavos)}</strong>
          <p>of {formatPhp(campaign.fundingGoalCentavos)} goal</p>
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
              <dt>PayMongo processing fees</dt>
              <dd>{formatPhp(campaign.processingFeeCentavos)}</dd>
            </div>
            <div>
              <dt>Net received by recipient</dt>
              <dd>{formatPhp(campaign.netReceivedCentavos)}</dd>
            </div>
            <div>
              <dt>Confirmed disbursements</dt>
              <dd>{formatPhp(campaign.disbursedCentavos)}</dd>
            </div>
            <div>
              <dt>Publicly unallocated balance</dt>
              <dd>
                {formatPhp(
                  campaign.netReceivedCentavos - campaign.disbursedCentavos,
                )}
              </dd>
            </div>
          </dl>
        </div>
      </section>
      <div className="campaign-content-grid">
        <section className="campaign-audit">
          <div className="section-heading compact-heading">
            <div>
              <span className="eyebrow">Public record</span>
              <h2>Audit trail</h2>
            </div>
          </div>
          <div className="evidence-notice">
            <CircleAlert size={20} />
            <p>
              On-chain anchoring proves a published record has not changed.
              Source documents and independent confirmations support the
              underlying real-world event.
            </p>
          </div>
          {campaign.events.length ? (
            <AuditTimeline events={campaign.events} />
          ) : (
            <div className="empty-state compact-empty">
              <h3>No transactions recorded yet.</h3>
              <p>
                Verified PayMongo payments and reviewed disbursements will
                appear here.
              </p>
            </div>
          )}
        </section>
        <aside>
          <DonationCheckout campaignId={campaign.id} />
          <div className="aside-card">
            <h2>Target beneficiaries</h2>
            <p>{campaign.targetBeneficiaries}</p>
            <h3>Evidence privacy</h3>
            <p>
              Receipts and permits stay in private storage. Public entries
              expose only redacted context and cryptographic fingerprints.
            </p>
          </div>
        </aside>
      </div>
    </main>
  );
}
