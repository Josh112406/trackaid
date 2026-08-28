import Link from "next/link";
import { redirect } from "next/navigation";
import {
  ArrowDownToLine,
  ArrowRight,
  Blocks,
  CircleDollarSign,
  FilePlus2,
  ShieldCheck,
} from "lucide-react";
import { AdminShell } from "@/components/admin-shell";
import { getAdminAccess } from "@/lib/admin-auth";
import { loadAdminData, sumCentavos } from "@/lib/admin-data";
import { formatPhp } from "@/lib/format";
export const dynamic = "force-dynamic";
export default async function AdminOverviewPage() {
  const access = await getAdminAccess();
  if (access.mode === "unauthorized") redirect("/admin/login");
  const data = await loadAdminData();
  const paid = data.donations.filter((r) => r.status === "paid");
  const received = sumCentavos(paid, "amount_centavos");
  const disbursed = sumCentavos(
    data.disbursements.filter((r) => r.status === "confirmed"),
    "amount_centavos",
  );
  const pending = data.ledgerJobs.filter(
    (r) => r.status === "pending" || r.status === "failed",
  ).length;
  return (
    <AdminShell email={access.email} role={access.role}>
      <header className="admin-topbar">
        <div>
          <span className="eyebrow">Operations dashboard</span>
          <h1>Money, proof, and system health.</h1>
        </div>
        <div className="admin-top-actions">
          <Link
            className="secondary-button"
            href="/api/admin/reports/transactions"
          >
            <ArrowDownToLine size={17} />
            Export reports
          </Link>
          <Link className="primary-button" href="/admin/submissions/new">
            <FilePlus2 size={17} />
            Add program
          </Link>
        </div>
      </header>
      <section className="admin-section">
        <div className="admin-section-heading">
          <div>
            <span>Live Supabase records</span>
            <h2>Overview</h2>
          </div>
          <p>
            TrackAid payments and official external redirects stay separate.
          </p>
        </div>
        <div className="metric-grid">
          <article className="metric-card metric-moss">
            <span>Confirmed donations</span>
            <strong>{formatPhp(received)}</strong>
            <small>{paid.length} reconciled payments</small>
          </article>
          <article className="metric-card metric-clay">
            <span>Confirmed disbursements</span>
            <strong>{formatPhp(disbursed)}</strong>
            <small>With reviewed evidence</small>
          </article>
          <article className="metric-card metric-ochre">
            <span>Published campaigns</span>
            <strong>
              {data.campaigns.filter((r) => r.status === "published").length}
            </strong>
            <small>
              {data.sources.filter((r) => r.is_visible).length} official sources
            </small>
          </article>
          <article className="metric-card metric-terracotta">
            <span>Awaiting review</span>
            <strong>
              {data.submissions.filter((r) => r.status === "submitted").length}
            </strong>
            <small>{pending} ledger jobs need processing</small>
          </article>
        </div>
        <div className="admin-two-column">
          <article className="admin-panel">
            <div className="panel-heading">
              <div>
                <span>Payment rail</span>
                <h3>Flow of money</h3>
              </div>
              <CircleDollarSign size={24} />
            </div>
            <div className="money-flow">
              <div>
                <span>Received</span>
                <strong>{formatPhp(received)}</strong>
              </div>
              <ArrowRight />
              <div>
                <span>Disbursed</span>
                <strong>{formatPhp(disbursed)}</strong>
              </div>
              <ArrowRight />
              <div>
                <span>Available</span>
                <strong>{formatPhp(Math.max(0, received - disbursed))}</strong>
              </div>
            </div>
          </article>
          <article className="admin-panel">
            <div className="panel-heading">
              <div>
                <span>Integrity layer</span>
                <h3>Audit coverage</h3>
              </div>
              <Blocks size={24} />
            </div>
            <ul className="attention-list">
              <li>
                <strong>{data.auditEntries.length}</strong>
                <span>Public audit entries</span>
              </li>
              <li>
                <strong>
                  {
                    data.ledgerJobs.filter((r) => r.status === "confirmed")
                      .length
                  }
                </strong>
                <span>Confirmed anchors</span>
              </li>
              <li>
                <strong>
                  {
                    data.webhookEvents.filter((r) => r.status === "failed")
                      .length
                  }
                </strong>
                <span>Failed webhook events</span>
              </li>
            </ul>
          </article>
        </div>
      </section>
      <div className="admin-production-note">
        <ShieldCheck size={18} />
        <p>
          {data.connected
            ? "Metrics are loaded from the connected Supabase project."
            : "Some database queries were unavailable. No substitute figures are shown."}
        </p>
      </div>
    </AdminShell>
  );
}
