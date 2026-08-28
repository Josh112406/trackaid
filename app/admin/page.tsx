import Link from "next/link";
import { redirect } from "next/navigation";
import {
  Activity,
  AlertTriangle,
  ArrowDownToLine,
  ArrowUpRight,
  BarChart3,
  Blocks,
  CheckCircle2,
  ChevronRight,
  CircleDollarSign,
  ClipboardCheck,
  ExternalLink,
  FileClock,
  FilePlus2,
  Gauge,
  Landmark,
  LayoutDashboard,
  ListChecks,
  RefreshCcw,
  ScrollText,
  Settings,
  ShieldCheck,
  Users,
  Webhook,
} from "lucide-react";

import { AdminLogoutButton } from "@/components/admin-logout-button";

import {
  adminMetrics,
  auditLogRows,
  funnelSteps,
  healthItems,
  reviewQueue,
  trafficByDay,
  transactionRows,
} from "@/lib/admin-data";
import { getAdminAccess } from "@/lib/admin-auth";
import { officialCampaignSources } from "@/lib/official-sources";

const navItems = [
  ["Overview", "#overview", LayoutDashboard],
  ["Programs", "#programs", ClipboardCheck],
  ["Transactions", "#transactions", CircleDollarSign],
  ["External sources", "#sources", ExternalLink],
  ["Evidence", "#evidence", FileClock],
  ["Blockchain", "#blockchain", Blocks],
  ["Analytics", "#analytics", BarChart3],
  ["System health", "#health", Gauge],
  ["Audit log", "#audit-log", ScrollText],
];

export default async function AdminDashboardPage() {
  const access = await getAdminAccess();
  if (access.mode === "unauthorized") redirect("/admin/login");
  const maxTraffic = Math.max(...trafficByDay);

  return (
    <main id="main-content" className="admin-shell">
      <aside className="admin-sidebar">
        <div className="admin-sidebar-heading">
          <ShieldCheck size={22} aria-hidden="true" />
          <div>
            <strong>TrackAid</strong>
            <span>Control room</span>
          </div>
        </div>
        <nav aria-label="Admin dashboard sections">
          {navItems.map(([label, href, Icon]) => (
            <a href={href as string} key={label as string}>
              <Icon size={17} aria-hidden="true" /> {label as string}
            </a>
          ))}
        </nav>
        <div className="admin-account">
          <span>{access.role}</span>
          <strong>{access.email}</strong>
          <Link href="/">
            <ArrowUpRight size={15} aria-hidden="true" /> Public site
          </Link>
          {access.mode === "authenticated" ? <AdminLogoutButton /> : null}
        </div>
      </aside>

      <div className="admin-main">
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
              <ArrowDownToLine size={17} aria-hidden="true" /> Export reports
            </Link>
            <Link className="primary-button" href="/admin/submissions/new">
              <FilePlus2 size={17} aria-hidden="true" /> Add program
            </Link>
          </div>
        </header>

        {access.mode === "preview" ? (
          <div className="admin-preview-banner" role="status">
            <AlertTriangle size={19} aria-hidden="true" />
            <div>
              <strong>Safe preview mode</strong>
              <p>
                This dashboard uses synthetic records. Add the Supabase secret
                and provision an owner account before switching on protected
                live administration.
              </p>
            </div>
          </div>
        ) : null}

        <section id="overview" className="admin-section">
          <div className="admin-section-heading">
            <div>
              <span>Today at a glance</span>
              <h2>Overview</h2>
            </div>
            <p>
              TrackAid-processed money and external campaign activity are always
              reported separately.
            </p>
          </div>
          <div className="metric-grid">
            {adminMetrics.map((metric) => (
              <article
                className={`metric-card metric-${metric.tone}`}
                key={metric.label}
              >
                <span>{metric.label}</span>
                <strong>{metric.value}</strong>
                <small>{metric.change}</small>
              </article>
            ))}
          </div>
          <div className="admin-two-column">
            <article className="admin-panel money-flow-panel">
              <div className="panel-heading">
                <div>
                  <span>TrackAid payment rail</span>
                  <h3>Flow of money</h3>
                </div>
                <Landmark size={24} aria-hidden="true" />
              </div>
              <div className="money-flow">
                <div>
                  <span>Confirmed payments</span>
                  <strong>₱1,684,200</strong>
                </div>
                <ChevronRight aria-hidden="true" />
                <div>
                  <span>Disbursed</span>
                  <strong>₱943,000</strong>
                </div>
                <ChevronRight aria-hidden="true" />
                <div>
                  <span>Remaining</span>
                  <strong>₱741,200</strong>
                </div>
              </div>
              <p className="panel-note">
                Based only on PayMongo transactions reconciled by TrackAid.
                External donation amounts are excluded.
              </p>
            </article>
            <article className="admin-panel alert-panel">
              <div className="panel-heading">
                <div>
                  <span>Needs attention</span>
                  <h3>Operations queue</h3>
                </div>
                <Activity size={24} aria-hidden="true" />
              </div>
              <ul className="attention-list">
                <li>
                  <strong>7</strong>
                  <span>Programs awaiting review</span>
                </li>
                <li>
                  <strong>3</strong>
                  <span>Test ledger jobs pending</span>
                </li>
                <li>
                  <strong>1</strong>
                  <span>Failed payment requires review</span>
                </li>
              </ul>
            </article>
          </div>
        </section>

        <section id="programs" className="admin-section">
          <div className="admin-section-heading">
            <div>
              <span>Manual submissions</span>
              <h2>Proof-review queue</h2>
            </div>
            <Link className="text-link" href="/admin/submissions/new">
              Add fundraising program{" "}
              <ArrowUpRight size={16} aria-hidden="true" />
            </Link>
          </div>
          <div className="admin-table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Organization and program</th>
                  <th>Evidence received</th>
                  <th>Status</th>
                  <th>Waiting</th>
                  <th>
                    <span className="sr-only">Review</span>
                  </th>
                </tr>
              </thead>
              <tbody>
                {reviewQueue.map((row) => (
                  <tr key={row.program}>
                    <td>
                      <strong>{row.program}</strong>
                      <span>{row.organization}</span>
                    </td>
                    <td>{row.proof}</td>
                    <td>
                      <span
                        className={`table-status table-status-${row.status.toLowerCase().replace(" ", "-")}`}
                      >
                        {row.status}
                      </span>
                    </td>
                    <td>{row.age}</td>
                    <td>
                      <button className="table-action" type="button">
                        Review <ChevronRight size={15} aria-hidden="true" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        <section id="transactions" className="admin-section">
          <div className="admin-section-heading">
            <div>
              <span>PayMongo and disbursements</span>
              <h2>TrackAid transactions</h2>
            </div>
            <div className="report-links">
              <Link href="/api/admin/reports/transactions">
                Transactions CSV
              </Link>
              <Link href="/api/admin/reports/campaigns">Programs CSV</Link>
            </div>
          </div>
          <div className="admin-table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Reference</th>
                  <th>Campaign</th>
                  <th>Type</th>
                  <th>Amount</th>
                  <th>Status</th>
                  <th>Time</th>
                </tr>
              </thead>
              <tbody>
                {transactionRows.map((row) => (
                  <tr key={row.id}>
                    <td>
                      <code>{row.id}</code>
                    </td>
                    <td>{row.campaign}</td>
                    <td>{row.type}</td>
                    <td>
                      <strong>{row.amount}</strong>
                    </td>
                    <td>
                      <span
                        className={`table-status table-status-${row.status.toLowerCase()}`}
                      >
                        {row.status}
                      </span>
                    </td>
                    <td>{row.time}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        <section id="sources" className="admin-section">
          <div className="admin-section-heading">
            <div>
              <span>External handoffs</span>
              <h2>Official-source monitoring</h2>
            </div>
            <p>
              Checked every six hours and hidden after 24 hours without a valid
              official donation route.
            </p>
          </div>
          <div className="source-admin-grid">
            {officialCampaignSources.map((source) => (
              <article className="source-admin-card" key={source.slug}>
                <div>
                  <CheckCircle2 size={20} aria-hidden="true" />
                  <span>{source.sourceHealth}</span>
                </div>
                <h3>{source.organizationName}</h3>
                <p>{source.sourceDomain}</p>
                <dl>
                  <div>
                    <dt>Last check</dt>
                    <dd>Today, 5:20 AM</dd>
                  </div>
                  <div>
                    <dt>Redirects</dt>
                    <dd>{source.slug.length * 37}</dd>
                  </div>
                </dl>
                <a
                  href={source.officialSourceUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  Open official source{" "}
                  <ArrowUpRight size={15} aria-hidden="true" />
                </a>
              </article>
            ))}
          </div>
        </section>

        <section id="evidence" className="admin-section">
          <div className="admin-section-heading">
            <div>
              <span>Private documents, public fingerprints</span>
              <h2>Evidence coverage</h2>
            </div>
            <p>
              Pubmats, posts, websites, video, and news may demonstrate a
              campaign; approval still requires organization authorization.
            </p>
          </div>
          <div className="evidence-kpi-grid">
            <article>
              <strong>24</strong>
              <span>Public campaign proofs</span>
            </article>
            <article>
              <strong>11</strong>
              <span>Private identity documents</span>
            </article>
            <article>
              <strong>100%</strong>
              <span>Files with SHA-256 fingerprints</span>
            </article>
            <article>
              <strong>2</strong>
              <span>Proofs expiring in 30 days</span>
            </article>
          </div>
        </section>

        <section id="blockchain" className="admin-section">
          <div className="admin-section-heading">
            <div>
              <span>Polygon Amoy test mode</span>
              <h2>Blockchain anchors</h2>
            </div>
            <span className="network-pill">
              <Blocks size={16} aria-hidden="true" /> Hashes only · no personal
              data
            </span>
          </div>
          <div className="ledger-health">
            <article>
              <span>Confirmed anchors</span>
              <strong>46</strong>
              <small>
                Approved proofs, donations, disbursements, confirmations
              </small>
            </article>
            <article>
              <span>Pending</span>
              <strong>3</strong>
              <small>Next retry in under five minutes</small>
            </article>
            <article>
              <span>Failed</span>
              <strong>0</strong>
              <small>No unresolved testnet failures</small>
            </article>
          </div>
        </section>

        <section id="analytics" className="admin-section">
          <div className="admin-section-heading">
            <div>
              <span>Privacy-respecting product analytics</span>
              <h2>Engagement and conversion</h2>
            </div>
            <Link href="/api/admin/reports/analytics">Analytics CSV</Link>
          </div>
          <div className="admin-two-column analytics-grid">
            <article className="admin-panel">
              <div className="panel-heading">
                <div>
                  <span>Last 14 days</span>
                  <h3>Campaign activity</h3>
                </div>
                <BarChart3 size={23} aria-hidden="true" />
              </div>
              <div
                className="traffic-chart"
                role="img"
                aria-label="Campaign activity increased over the last fourteen days"
              >
                {trafficByDay.map((value, index) => (
                  <span
                    key={index}
                    style={{
                      height: `${Math.round((value / maxTraffic) * 100)}%`,
                    }}
                  />
                ))}
              </div>
              <div className="chart-axis">
                <span>14 days ago</span>
                <span>Today</span>
              </div>
            </article>
            <article className="admin-panel">
              <div className="panel-heading">
                <div>
                  <span>All campaign traffic</span>
                  <h3>Conversion funnel</h3>
                </div>
                <ListChecks size={23} aria-hidden="true" />
              </div>
              <ol className="funnel-list">
                {funnelSteps.map((step) => (
                  <li key={step.label}>
                    <div>
                      <span>{step.label}</span>
                      <strong>{step.value.toLocaleString("en-PH")}</strong>
                    </div>
                    <div className="funnel-track">
                      <span style={{ width: `${step.percent}%` }} />
                    </div>
                  </li>
                ))}
              </ol>
            </article>
          </div>
        </section>

        <section id="health" className="admin-section">
          <div className="admin-section-heading">
            <div>
              <span>Operational monitoring</span>
              <h2>System health</h2>
            </div>
            <button className="secondary-button" type="button">
              <RefreshCcw size={16} aria-hidden="true" /> Refresh checks
            </button>
          </div>
          <div className="health-grid">
            {healthItems.map((item) => (
              <article key={item.label}>
                <span className={`health-dot health-${item.tone}`} />
                <div>
                  <span>{item.label}</span>
                  <strong>{item.value}</strong>
                </div>
              </article>
            ))}
          </div>
        </section>

        <section id="audit-log" className="admin-section">
          <div className="admin-section-heading">
            <div>
              <span>Append-only operational history</span>
              <h2>Administrator audit log</h2>
            </div>
            <Link href="/api/admin/reports/audit-log">Audit CSV</Link>
          </div>
          <div className="admin-table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Action</th>
                  <th>Actor</th>
                  <th>Entity</th>
                  <th>Time</th>
                </tr>
              </thead>
              <tbody>
                {auditLogRows.map((row) => (
                  <tr key={`${row.action}-${row.time}`}>
                    <td>{row.action}</td>
                    <td>{row.actor}</td>
                    <td>
                      <code>{row.entity}</code>
                    </td>
                    <td>{row.time}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        <footer className="admin-footer">
          <span>
            <Webhook size={16} aria-hidden="true" /> Webhooks monitored
          </span>
          <span>
            <Users size={16} aria-hidden="true" /> Role-based access prepared
          </span>
          <span>
            <Settings size={16} aria-hidden="true" /> Philippine time · PHP
          </span>
        </footer>
      </div>
    </main>
  );
}
