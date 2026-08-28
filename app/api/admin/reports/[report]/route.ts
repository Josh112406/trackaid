import { NextResponse } from "next/server";
import { getAdminAccess } from "@/lib/admin-auth";
import { loadAdminData } from "@/lib/admin-data";
import { toCsv } from "@/lib/csv";

export async function GET(
  _: Request,
  { params }: { params: Promise<{ report: string }> },
) {
  const access = await getAdminAccess();
  if (access.mode === "unauthorized")
    return NextResponse.json(
      { message: "Administrator sign-in required." },
      { status: 401 },
    );
  const { report } = await params;
  const data = await loadAdminData();
  const reports: Record<string, Array<Record<string, string | number>>> = {
    transactions: [
      ...data.donations.map((r) => ({
        reference: String(r.paymongo_payment_id ?? r.id),
        type: "donation",
        amount_centavos: Number(r.amount_centavos ?? 0),
        status: String(r.status),
        recorded_at: String(r.paid_at ?? r.created_at),
      })),
      ...data.disbursements.map((r) => ({
        reference: String(r.id),
        type: "disbursement",
        amount_centavos: Number(r.amount_centavos ?? 0),
        status: String(r.status),
        recorded_at: String(r.occurred_at),
      })),
    ],
    programs: data.submissions.map((r) => ({
      organization: String(r.organization_name),
      program: String(r.program_name),
      domain: String(r.official_domain),
      status: String(r.status),
      created_at: String(r.created_at),
    })),
    analytics: data.analytics.map((r) => ({
      event: String(r.event_kind),
      path: String(r.path),
      amount_centavos:
        r.amount_centavos === null ? "" : Number(r.amount_centavos ?? 0),
      occurred_at: String(r.occurred_at),
    })),
    "audit-log": data.adminAudit.map((r) => ({
      action: String(r.action),
      entity_type: String(r.entity_type),
      entity_id: String(r.entity_id ?? ""),
      recorded_at: String(r.created_at),
    })),
  };
  if (!(report in reports))
    return NextResponse.json({ message: "Report not found." }, { status: 404 });
  const csv = toCsv(reports[report]);
  const date = new Date().toISOString().slice(0, 10);
  return new NextResponse(csv, {
    headers: {
      "content-disposition": `attachment; filename="trackaid-${report}-${date}.csv"`,
      "content-type": "text/csv; charset=utf-8",
      "cache-control": "no-store",
    },
  });
}
