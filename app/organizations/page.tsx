import Link from "next/link";
import { ArrowRight, Building2, FileCheck2, Landmark } from "lucide-react";
export default function OrganizationsPage() {
  return (
    <main id="main-content" className="simple-page content-page">
      <span className="section-label">Organizations</span>
      <h1>Publish a program only after authority is proven.</h1>
      <p className="page-lede">
        Organization-owned pages can submit fundraising programs. Review
        requires proof of registration or authority, an official source, and a
        registered payout account.
      </p>
      <div className="feature-grid">
        <article>
          <Building2 size={28} />
          <h2>Identity</h2>
          <p>Legal name, official domain, and accountable representative.</p>
        </article>
        <article>
          <FileCheck2 size={28} />
          <h2>Program proof</h2>
          <p>
            Official posts, pubmats, budgets, permits, and beneficiary plans.
          </p>
        </article>
        <article>
          <Landmark size={28} />
          <h2>Settlement</h2>
          <p>The payout account must belong to the verified organization.</p>
        </article>
      </div>
      <Link className="primary-button" href="/verify">
        Start organization verification <ArrowRight size={17} />
      </Link>
    </main>
  );
}
