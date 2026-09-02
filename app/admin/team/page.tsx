import { redirect } from "next/navigation";
import { ShieldCheck } from "lucide-react";

import { AdminInviteForm } from "@/components/admin-invite-form";
import { AdminShell } from "@/components/admin-shell";
import { getAdminAccess } from "@/lib/admin-auth";

export const dynamic = "force-dynamic";

export default async function AdminTeamPage() {
  const access = await getAdminAccess();
  if (access.mode === "unauthorized") {
    redirect("/admin/login?next=/admin/team");
  }
  if (access.role !== "owner") redirect("/admin");

  return (
    <AdminShell email={access.email} role={access.role}>
      <header className="admin-topbar">
        <div>
          <span className="eyebrow">Access control</span>
          <h1>Admin team</h1>
          <p>Create scoped, one-time invitations without sharing passwords.</p>
        </div>
      </header>
      <section className="admin-section admin-team-grid">
        <AdminInviteForm />
        <aside className="admin-panel admin-role-guide">
          <div className="panel-heading">
            <div>
              <span>Permission guide</span>
              <h3>Choose the minimum access</h3>
            </div>
            <ShieldCheck size={24} aria-hidden="true" />
          </div>
          <dl>
            <div>
              <dt>Reviewer</dt>
              <dd>Reviews programs, evidence, and operational records.</dd>
            </div>
            <div>
              <dt>Auditor</dt>
              <dd>Inspects dashboards and reports without approval powers.</dd>
            </div>
          </dl>
        </aside>
      </section>
    </AdminShell>
  );
}
