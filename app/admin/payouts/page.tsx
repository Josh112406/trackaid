import { BadgeCheck, CircleAlert, Landmark } from "lucide-react";
import { redirect } from "next/navigation";

import {
  approvePaymentDestination,
  submitPaymentDestination,
} from "@/app/admin/payouts/actions";
import { AdminShell } from "@/components/admin-shell";
import { getAdminAccess } from "@/lib/admin-auth";
import { createAdminClient } from "@/lib/supabase/admin";

export const dynamic = "force-dynamic";

export default async function PayoutRoutingPage({
  searchParams,
}: {
  searchParams: Promise<{ updated?: string }>;
}) {
  const [access, query] = await Promise.all([getAdminAccess(), searchParams]);
  if (access.mode === "unauthorized")
    redirect("/admin/login?next=/admin/payouts");
  const admin = createAdminClient();
  const [organizationResult, destinationResult] = admin
    ? await Promise.all([
        admin
          .from("organizations")
          .select("id,name,slug,status")
          .eq("status", "verified")
          .order("name"),
        admin
          .from("organization_payment_destinations")
          .select(
            "organization_id,paymongo_merchant_id,status,submitted_by,reviewed_by,reviewed_at,updated_at",
          ),
      ])
    : [
        { data: [], error: null },
        { data: [], error: null },
      ];
  const organizations = organizationResult.data ?? [];
  const destinations = destinationResult.data ?? [];
  const canManage =
    access.mode === "authenticated" &&
    (access.role === "owner" || access.role === "reviewer");

  return (
    <AdminShell email={access.email} role={access.role}>
      <header className="admin-topbar">
        <div>
          <span className="eyebrow">Direct recipient settlement</span>
          <h1>Payout routing</h1>
          <p>
            Connect each verified organization to its PayMongo merchant account.
            One administrator submits the destination and another approves it.
          </p>
        </div>
      </header>
      <section className="admin-section">
        {query.updated ? (
          <div className="checkout-banner checkout-success">
            <BadgeCheck size={19} />
            <p>
              {query.updated === "active"
                ? "The direct recipient route is active."
                : "The recipient route is waiting for an independent reviewer."}
            </p>
          </div>
        ) : null}
        <div className="admin-production-note">
          <Landmark size={19} />
          <p>
            PayMongo must activate Split Payments and configure the merchant
            relationship before the merchant ID can be used. Live donations are
            blocked when a campaign has no independently approved destination.
          </p>
        </div>
        {organizations.length ? (
          <div className="admin-table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Organization</th>
                  <th>PayMongo merchant</th>
                  <th>Status</th>
                  <th>Control</th>
                </tr>
              </thead>
              <tbody>
                {organizations.map((organization) => {
                  const destination = destinations.find(
                    (item) => item.organization_id === organization.id,
                  );
                  const submittedByCurrentUser =
                    access.mode === "authenticated" &&
                    destination?.submitted_by === access.userId;
                  return (
                    <tr key={organization.id}>
                      <td>
                        <strong>{organization.name}</strong>
                        <span>{organization.slug}</span>
                      </td>
                      <td>
                        {canManage ? (
                          <form action={submitPaymentDestination}>
                            <input
                              name="organizationId"
                              type="hidden"
                              value={organization.id}
                            />
                            <input
                              aria-label={`PayMongo merchant ID for ${organization.name}`}
                              defaultValue={
                                destination?.paymongo_merchant_id ?? ""
                              }
                              name="merchantId"
                              pattern="org_[A-Za-z0-9]{10,}"
                              placeholder="org_..."
                              required
                            />
                            <button className="secondary-button" type="submit">
                              Submit route
                            </button>
                          </form>
                        ) : (
                          <code>
                            {destination?.paymongo_merchant_id ??
                              "Not configured"}
                          </code>
                        )}
                      </td>
                      <td>
                        <span className="table-status">
                          {destination?.status ?? "not configured"}
                        </span>
                      </td>
                      <td>
                        {destination?.status === "pending" && canManage ? (
                          submittedByCurrentUser ? (
                            <span>
                              <CircleAlert size={15} /> Another reviewer
                              required
                            </span>
                          ) : (
                            <form action={approvePaymentDestination}>
                              <input
                                name="organizationId"
                                type="hidden"
                                value={organization.id}
                              />
                              <button className="primary-button" type="submit">
                                Approve route
                              </button>
                            </form>
                          )
                        ) : destination?.status === "active" ? (
                          "Direct settlement enabled"
                        ) : (
                          "Submit a merchant ID"
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="empty-state compact-empty">
            <h3>No verified organization is ready for payout routing.</h3>
            <p>
              Complete organization verification before connecting a PayMongo
              recipient.
            </p>
          </div>
        )}
      </section>
    </AdminShell>
  );
}
