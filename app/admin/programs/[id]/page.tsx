import Link from "next/link";
import { ArrowLeft, ArrowUpRight, FileCheck2 } from "lucide-react";
import { notFound, redirect } from "next/navigation";
import { AdminShell } from "@/components/admin-shell";
import { ProgramReviewActions } from "@/components/program-review-actions";
import { getAdminAccess } from "@/lib/admin-auth";
import { loadAdminData } from "@/lib/admin-data";

export const dynamic = "force-dynamic";
export default async function ProgramReviewPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const access = await getAdminAccess();
  if (access.mode === "unauthorized") redirect("/admin/login");
  const { id } = await params;
  const data = await loadAdminData();
  const program = data.submissions.find((r) => r.id === id);
  if (!program) notFound();
  const proofs = data.proofs.filter((r) => r.submission_id === id);
  return (
    <AdminShell email={access.email} role={access.role}>
      <header className="admin-topbar">
        <div className="admin-review-heading">
          <div className="admin-review-context">
            <Link className="back-link" href="/admin/programs">
              <ArrowLeft size={16} />
              Programs
            </Link>
            <span className="eyebrow">Proof review</span>
          </div>
          <h1>{String(program.program_name)}</h1>
          <p>
            {String(program.organization_name)} ·{" "}
            {String(program.official_domain)}
          </p>
        </div>
        <ProgramReviewActions
          id={id}
          status={String(program.status)}
          isOwnSubmission={
            access.mode === "authenticated" &&
            String(program.submitted_by) === access.userId
          }
          canApproveOwnSubmission={
            access.mode === "authenticated" && access.role === "owner"
          }
        />
      </header>
      <section className="admin-section">
        <div className="admin-section-heading">
          <div>
            <span>Submitted evidence</span>
            <h2>Proof package</h2>
          </div>
          <span className="table-status">{String(program.status)}</span>
        </div>
        {proofs.length ? (
          <div className="proof-grid">
            {proofs.map((proof) => (
              <article className="admin-panel" key={String(proof.id)}>
                <FileCheck2 size={22} />
                <h3>{String(proof.label)}</h3>
                <p>{String(proof.kind).replaceAll("_", " ")}</p>
                {proof.public_url ? (
                  <a
                    href={String(proof.public_url)}
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    Open public proof <ArrowUpRight size={15} />
                  </a>
                ) : (
                  <span>
                    Private evidence · fingerprint{" "}
                    {String(proof.sha256).slice(0, 12)}…
                  </span>
                )}
              </article>
            ))}
          </div>
        ) : (
          <div className="empty-state compact-empty">
            <h3>No proof attached.</h3>
            <p>Request information before approving this program.</p>
          </div>
        )}
      </section>
    </AdminShell>
  );
}
