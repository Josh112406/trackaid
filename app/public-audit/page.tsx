import Link from "next/link";
import {
  ArrowRight,
  Blocks,
  FileCheck2,
  HandCoins,
  ReceiptText,
} from "lucide-react";

import { loadPublishedCampaigns } from "@/lib/campaigns";
import { formatPhp } from "@/lib/format";

export const revalidate = 60;

export default async function PublicAuditPage() {
  const campaigns = await loadPublishedCampaigns();
  const totals = campaigns.reduce(
    (sum, campaign) => ({
      received: sum.received + campaign.receivedCentavos,
      fees: sum.fees + campaign.processingFeeCentavos,
      net: sum.net + campaign.netReceivedCentavos,
      disbursed: sum.disbursed + campaign.disbursedCentavos,
    }),
    { received: 0, fees: 0, net: 0, disbursed: 0 },
  );
  const unallocated = totals.net - totals.disbursed;

  return (
    <main id="main-content" className="simple-page content-page">
      <span className="section-label">Public audit</span>
      <h1>Read the money trail without exposing private records.</h1>
      <p className="page-lede">
        Gross donations, PayMongo fees, net recipient amounts, confirmed
        disbursements, and signed Solana records reconcile in public. Identity
        documents, bank details, receipts, and donor information remain private.
      </p>
      <div className="evidence-kpi-grid">
        <article>
          <strong>{formatPhp(totals.received)}</strong>
          <span>Gross donations confirmed</span>
        </article>
        <article>
          <strong>{formatPhp(totals.fees)}</strong>
          <span>Payment-processing fees</span>
        </article>
        <article>
          <strong>{formatPhp(totals.net)}</strong>
          <span>Net received by recipients</span>
        </article>
        <article>
          <strong>{formatPhp(unallocated)}</strong>
          <span>Publicly unallocated balance</span>
        </article>
      </div>
      <div className="feature-grid">
        <article>
          <HandCoins size={28} />
          <h2>Signed payments</h2>
          <p>Only verified PayMongo webhook events enter campaign totals.</p>
        </article>
        <article>
          <ReceiptText size={28} />
          <h2>Reconciliation</h2>
          <p>Gross donations minus fees equal the net recipient amount.</p>
        </article>
        <article>
          <FileCheck2 size={28} />
          <h2>Private evidence</h2>
          <p>
            Receipts stay private; fingerprints allow later integrity checks.
          </p>
        </article>
        <article>
          <Blocks size={28} />
          <h2>Exact-value anchors</h2>
          <p>
            Every confirmed donation queues one signed record containing the
            exact PHP centavo amount, without moving the funds on-chain.
          </p>
        </article>
      </div>
      {campaigns.length ? (
        <div className="admin-table-wrap">
          <table>
            <thead>
              <tr>
                <th>Campaign</th>
                <th>Gross</th>
                <th>Fees</th>
                <th>Net recipient amount</th>
                <th>Disbursed</th>
                <th>Unallocated</th>
              </tr>
            </thead>
            <tbody>
              {campaigns.map((campaign) => (
                <tr key={campaign.id}>
                  <td>
                    <Link href={`/campaigns/${campaign.slug}`}>
                      {campaign.title}
                    </Link>
                  </td>
                  <td>{formatPhp(campaign.receivedCentavos)}</td>
                  <td>{formatPhp(campaign.processingFeeCentavos)}</td>
                  <td>{formatPhp(campaign.netReceivedCentavos)}</td>
                  <td>{formatPhp(campaign.disbursedCentavos)}</td>
                  <td>
                    {formatPhp(
                      campaign.netReceivedCentavos - campaign.disbursedCentavos,
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <div className="empty-state compact-empty">
          <h3>No reconciled campaign transactions yet.</h3>
          <p>
            This report fills automatically after a verified campaign receives
            its first signed PayMongo payment.
          </p>
        </div>
      )}
      <Link className="primary-button" href="/campaigns">
        Open campaign records <ArrowRight size={17} />
      </Link>
    </main>
  );
}
