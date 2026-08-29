import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import {
  ArrowDownToLine,
  ArrowUpRight,
  Blocks,
  FilePlus2,
  RefreshCcw,
} from "lucide-react";
import { AdminShell } from "@/components/admin-shell";
import { getAdminAccess } from "@/lib/admin-auth";
import { loadAdminData } from "@/lib/admin-data";
import { formatDateTime, formatPhp } from "@/lib/format";

const valid = [
  "programs",
  "transactions",
  "sources",
  "evidence",
  "blockchain",
  "analytics",
  "health",
  "audit-log",
] as const;
type Section = (typeof valid)[number];
const title: Record<Section, [string, string, string]> = {
  programs: [
    "Manual submissions",
    "Programs",
    "Review authority, sources, and proof before publishing.",
  ],
  transactions: [
    "PayMongo and disbursements",
    "Transactions",
    "Trace every on-platform peso from payment to confirmed use.",
  ],
  sources: [
    "External handoffs",
    "Official sources",
    "Monitor organization-owned donation routes separately.",
  ],
  evidence: [
    "Private documents, public fingerprints",
    "Evidence",
    "Track proof coverage without exposing sensitive files.",
  ],
  blockchain: [
    "Append-only integrity records",
    "Blockchain",
    "Monitor audit-anchor jobs and confirmed transactions.",
  ],
  analytics: [
    "Privacy-respecting measurement",
    "Analytics",
    "Understand campaign discovery and checkout conversion.",
  ],
  health: [
    "Operational monitoring",
    "System health",
    "Check integrations, webhooks, and background processing.",
  ],
  "audit-log": [
    "Administrator activity",
    "Audit log",
    "Review security-sensitive changes and operational actions.",
  ],
};
const text = (v: unknown) => String(v ?? "—");
const date = (v: unknown) => (v ? formatDateTime(String(v)) : "—");

export const dynamic = "force-dynamic";
export default async function AdminSectionPage({
  params,
}: {
  params: Promise<{ section: string }>;
}) {
  const { section: raw } = await params;
  if (!valid.includes(raw as Section)) notFound();
  const section = raw as Section;
  const access = await getAdminAccess();
  if (access.mode === "unauthorized")
    redirect(`/admin/login?next=/admin/${section}`);
  const data = await loadAdminData();
  const [eyebrow, heading, description] = title[section];
  return (
    <AdminShell email={access.email} role={access.role}>
      <header className="admin-topbar">
        <div>
          <span className="eyebrow">{eyebrow}</span>
          <h1>{heading}</h1>
          <p>{description}</p>
        </div>
        <div className="admin-top-actions">
          {section === "programs" ? (
            <Link className="primary-button" href="/admin/submissions/new">
              <FilePlus2 size={17} />
              Add program
            </Link>
          ) : null}
          {["transactions", "analytics", "audit-log"].includes(section) ? (
            <Link
              className="secondary-button"
              href={`/api/admin/reports/${section}`}
            >
              <ArrowDownToLine size={17} />
              Export CSV
            </Link>
          ) : null}
        </div>
      </header>
      <section className="admin-section">
        {section === "programs" ? (
          <Programs rows={data.submissions} />
        ) : section === "transactions" ? (
          <Transactions
            donations={data.donations}
            disbursements={data.disbursements}
          />
        ) : section === "sources" ? (
          <Sources rows={data.sources} />
        ) : section === "evidence" ? (
          <Evidence proofs={data.proofs} entries={data.auditEntries} />
        ) : section === "blockchain" ? (
          <Blockchain jobs={data.ledgerJobs} />
        ) : section === "analytics" ? (
          <Analytics rows={data.analytics} />
        ) : section === "health" ? (
          <Health data={data} />
        ) : (
          <AuditLog rows={data.adminAudit} />
        )}
      </section>
    </AdminShell>
  );
}

function Empty({ children }: { children: string }) {
  return (
    <div className="empty-state compact-empty">
      <h3>Nothing to review yet.</h3>
      <p>{children}</p>
    </div>
  );
}
function Programs({ rows }: { rows: Array<Record<string, unknown>> }) {
  if (!rows.length)
    return (
      <Empty>
        New organization-owned programs will appear after an administrator saves
        or submits them.
      </Empty>
    );
  return (
    <div className="admin-table-wrap">
      <table>
        <thead>
          <tr>
            <th>Organization and program</th>
            <th>Domain</th>
            <th>Status</th>
            <th>Created</th>
            <th>Review</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((r) => (
            <tr key={text(r.id)}>
              <td>
                <strong>{text(r.program_name)}</strong>
                <span>{text(r.organization_name)}</span>
              </td>
              <td>{text(r.official_domain)}</td>
              <td>
                <span
                  className={`table-status table-status-${text(r.status).replaceAll("_", "-")}`}
                >
                  {text(r.status).replaceAll("_", " ")}
                </span>
              </td>
              <td>{date(r.created_at)}</td>
              <td>
                <Link
                  className="table-action"
                  href={`/admin/programs/${text(r.id)}`}
                >
                  Review <ArrowUpRight size={14} />
                </Link>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
function Transactions({
  donations,
  disbursements,
}: {
  donations: Array<Record<string, unknown>>;
  disbursements: Array<Record<string, unknown>>;
}) {
  const rows: Array<Record<string, unknown>> = [
    ...donations.map((r) => ({
      ...r,
      kind: "Donation",
      when: r.paid_at ?? r.created_at,
    })),
    ...disbursements.map((r) => ({
      ...r,
      kind: "Disbursement",
      when: r.occurred_at,
    })),
  ].sort((a, b) => String(b.when).localeCompare(String(a.when)));
  if (!rows.length)
    return (
      <Empty>
        Signed PayMongo payments and reviewed disbursements will appear here.
      </Empty>
    );
  return (
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
          {rows.map((r) => (
            <tr key={`${r.kind}-${text(r.id)}`}>
              <td>
                <code>{text(r.paymongo_payment_id ?? r.id)}</code>
              </td>
              <td>{text((r.campaigns as { title?: string } | null)?.title)}</td>
              <td>{text(r.kind)}</td>
              <td>
                <strong>{formatPhp(Number(r.amount_centavos ?? 0))}</strong>
                {r.kind === "Donation" ? (
                  <span>
                    Net {formatPhp(Number(r.net_amount_centavos ?? 0))} · Fees{" "}
                    {formatPhp(Number(r.fee_centavos ?? 0))}
                  </span>
                ) : null}
              </td>
              <td>{text(r.status)}</td>
              <td>{date(r.when)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
function Sources({ rows }: { rows: Array<Record<string, unknown>> }) {
  return (
    <div className="source-admin-grid">
      {rows.map((r) => (
        <article className="source-admin-card" key={text(r.id)}>
          <div>
            <span
              className={`health-dot health-${r.source_health === "healthy" ? "good" : "watch"}`}
            />
            <span>{text(r.source_health)}</span>
          </div>
          <h3>{text(r.organization_name)}</h3>
          <p>{text(r.source_domain)}</p>
          <dl>
            <div>
              <dt>Visible</dt>
              <dd>{r.is_visible ? "Yes" : "No"}</dd>
            </div>
            <div>
              <dt>Last check</dt>
              <dd>{date(r.last_checked_at)}</dd>
            </div>
          </dl>
          <a
            href={text(r.official_source_url)}
            target="_blank"
            rel="noopener noreferrer"
          >
            Open official source <ArrowUpRight size={15} />
          </a>
        </article>
      ))}
    </div>
  );
}
function Evidence({
  proofs,
  entries,
}: {
  proofs: Array<Record<string, unknown>>;
  entries: Array<Record<string, unknown>>;
}) {
  const hashed = proofs.filter((r) => r.sha256).length;
  return (
    <>
      <div className="evidence-kpi-grid">
        <article>
          <strong>{proofs.length}</strong>
          <span>Submitted proof items</span>
        </article>
        <article>
          <strong>{proofs.filter((r) => r.is_identity_proof).length}</strong>
          <span>Identity and authority proofs</span>
        </article>
        <article>
          <strong>
            {proofs.length ? Math.round((hashed / proofs.length) * 100) : 0}%
          </strong>
          <span>Proofs with SHA-256</span>
        </article>
        <article>
          <strong>{entries.filter((r) => r.evidence_sha256).length}</strong>
          <span>Public evidence fingerprints</span>
        </article>
      </div>
      {!proofs.length ? (
        <Empty>
          Proof metadata will appear after program submissions attach public or
          private evidence.
        </Empty>
      ) : null}
    </>
  );
}
function Blockchain({ jobs }: { jobs: Array<Record<string, unknown>> }) {
  const address = process.env.TRACKAID_LEDGER_ADDRESS;
  return (
    <>
      <div className="ledger-health">
        {["confirmed", "pending", "failed"].map((status) => (
          <article key={status}>
            <span>{status}</span>
            <strong>{jobs.filter((r) => r.status === status).length}</strong>
            <small>
              {status === "confirmed"
                ? "Anchors on Polygon"
                : status === "pending"
                  ? "Waiting for the recorder"
                  : "Needs operator attention"}
            </small>
          </article>
        ))}
      </div>
      <div className="admin-production-note">
        <Blocks size={18} />
        <p>
          {address ? (
            <>
              Contract{" "}
              <a
                href={`https://amoy.polygonscan.com/address/${address}`}
                target="_blank"
                rel="noopener noreferrer"
              >
                <code>{address}</code>
              </a>
            </>
          ) : (
            "The audit contract is compiled but no deployment address is configured."
          )}
        </p>
      </div>
    </>
  );
}
function Analytics({ rows }: { rows: Array<Record<string, unknown>> }) {
  const count = (kind: string) =>
    rows.filter((r) => r.event_kind === kind).length;
  const views = count("campaign_view"),
    starts = count("payment_intent_created"),
    paid = count("payment_paid");
  return (
    <div className="evidence-kpi-grid">
      <article>
        <strong>{views}</strong>
        <span>Campaign views</span>
      </article>
      <article>
        <strong>{starts}</strong>
        <span>Checkouts started</span>
      </article>
      <article>
        <strong>{paid}</strong>
        <span>Payments confirmed</span>
      </article>
      <article>
        <strong>{views ? Math.round((paid / views) * 100) : 0}%</strong>
        <span>View-to-payment conversion</span>
      </article>
    </div>
  );
}
function Health({ data }: { data: Awaited<ReturnType<typeof loadAdminData>> }) {
  const items = [
    [
      "Supabase",
      data.connected ? "Connected" : "Needs attention",
      data.connected,
    ],
    [
      "PayMongo secret",
      process.env.PAYMONGO_SECRET_KEY ? "Configured" : "Missing",
      !!process.env.PAYMONGO_SECRET_KEY,
    ],
    [
      "Webhook signing",
      process.env.PAYMONGO_WEBHOOK_SECRET ? "Configured" : "Missing",
      !!process.env.PAYMONGO_WEBHOOK_SECRET,
    ],
    [
      "Ledger recorder",
      process.env.TRACKAID_LEDGER_ADDRESS &&
      process.env.TRACKAID_RECORDER_PRIVATE_KEY
        ? "Configured"
        : "Not deployed",
      !!(
        process.env.TRACKAID_LEDGER_ADDRESS &&
        process.env.TRACKAID_RECORDER_PRIVATE_KEY
      ),
    ],
    [
      "Failed webhooks",
      String(data.webhookEvents.filter((r) => r.status === "failed").length),
      !data.webhookEvents.some((r) => r.status === "failed"),
    ],
  ] as const;
  return (
    <>
      <div className="admin-section-heading">
        <p>Checks refresh on every request.</p>
        <Link className="secondary-button" href="/admin/health">
          <RefreshCcw size={16} />
          Refresh checks
        </Link>
      </div>
      <div className="health-grid">
        {items.map(([label, value, ok]) => (
          <article key={label}>
            <span className={`health-dot health-${ok ? "good" : "watch"}`} />
            <div>
              <span>{label}</span>
              <strong>{value}</strong>
            </div>
          </article>
        ))}
      </div>
    </>
  );
}
function AuditLog({ rows }: { rows: Array<Record<string, unknown>> }) {
  if (!rows.length)
    return (
      <Empty>
        Administrator actions will be recorded here as review workflows are
        completed.
      </Empty>
    );
  return (
    <div className="admin-table-wrap">
      <table>
        <thead>
          <tr>
            <th>Action</th>
            <th>Entity</th>
            <th>Reference</th>
            <th>Time</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((r) => (
            <tr key={text(r.id)}>
              <td>{text(r.action)}</td>
              <td>{text(r.entity_type)}</td>
              <td>
                <code>{text(r.entity_id)}</code>
              </td>
              <td>{date(r.created_at)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
