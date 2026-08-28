import { NextResponse } from "next/server";

import {
  auditLogRows,
  funnelSteps,
  reviewQueue,
  transactionRows,
} from "@/lib/admin-data";
import { getAdminAccess } from "@/lib/admin-auth";
import { toCsv } from "@/lib/csv";
import { officialCampaignSources } from "@/lib/official-sources";

const reports = {
  transactions: transactionRows.map((row) => ({
    reference: row.id,
    campaign: row.campaign,
    transaction_type: row.type,
    amount_php: row.amount,
    status: row.status,
    recorded_at: row.time,
    stream: "TrackAid processed",
  })),
  campaigns: [
    ...reviewQueue.map((row) => ({
      organization: row.organization,
      program: row.program,
      source_type: "Manual submission",
      status: row.status,
      proof: row.proof,
    })),
    ...officialCampaignSources.map((source) => ({
      organization: source.organizationName,
      program: source.title,
      source_type: "Official external source",
      status: source.sourceHealth,
      proof: source.officialSourceUrl,
    })),
  ],
  analytics: funnelSteps.map((step) => ({
    metric: step.label,
    count: step.value,
    percent_of_campaign_views: step.percent,
  })),
  "audit-log": auditLogRows.map((row) => ({
    action: row.action,
    actor: row.actor,
    entity: row.entity,
    recorded_at: row.time,
  })),
} satisfies Record<string, Array<Record<string, string | number>>>;

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
  if (!(report in reports))
    return NextResponse.json({ message: "Report not found." }, { status: 404 });
  const csv = toCsv(reports[report as keyof typeof reports]);
  return new NextResponse(csv, {
    headers: {
      "content-disposition": `attachment; filename="trackaid-${report}-2026-08-27.csv"`,
      "content-type": "text/csv; charset=utf-8",
      "cache-control": "no-store",
    },
  });
}
