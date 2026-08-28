import Link from "next/link";
import { ArrowRight, Blocks, FileCheck2, HandCoins } from "lucide-react";
export default function PublicAuditPage() {
  return (
    <main id="main-content" className="simple-page content-page">
      <span className="demo-label">Public audit</span>
      <h1>Read the money trail without exposing private records.</h1>
      <p className="page-lede">
        Each campaign publishes confirmed payment totals, reviewed
        disbursements, redacted descriptions, evidence fingerprints, and ledger
        transaction links.
      </p>
      <div className="feature-grid">
        <article>
          <HandCoins size={28} />
          <h2>Payments</h2>
          <p>Only signed PayMongo events enter the recorded total.</p>
        </article>
        <article>
          <FileCheck2 size={28} />
          <h2>Evidence</h2>
          <p>
            Receipts stay private; fingerprints allow later integrity checks.
          </p>
        </article>
        <article>
          <Blocks size={28} />
          <h2>Anchors</h2>
          <p>Polygon records make post-publication changes detectable.</p>
        </article>
      </div>
      <Link className="primary-button" href="/campaigns">
        Open campaign records <ArrowRight size={17} />
      </Link>
    </main>
  );
}
