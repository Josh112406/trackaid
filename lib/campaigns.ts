import { createPublicSupabaseClient } from "@/lib/supabase/public";
import type { AuditEvent, Campaign } from "@/lib/types";

type CampaignRow = {
  id: string;
  slug: string;
  title: string;
  disaster_name: string;
  location: string;
  summary: string;
  target_beneficiaries: string;
  funding_goal_centavos: number;
  received_centavos: number;
  processing_fee_centavos: number;
  net_received_centavos: number;
  disbursed_centavos: number;
  status: "published" | "closed";
  organizations: { name: string } | null;
  audit_entries: Array<{
    id: string;
    entity_type: AuditEvent["type"];
    title: string;
    public_detail: string;
    amount_centavos: number | null;
    occurred_at: string;
    status: AuditEvent["status"];
    ledger_tx_hash: string | null;
    evidence_sha256: string | null;
  }>;
};

function mapCampaign(row: CampaignRow): Campaign {
  return {
    id: row.id,
    slug: row.slug,
    title: row.title,
    disasterName: row.disaster_name,
    location: row.location,
    organization: row.organizations?.name ?? "Verified organization",
    summary: row.summary,
    targetBeneficiaries: row.target_beneficiaries,
    fundingGoalCentavos: Number(row.funding_goal_centavos),
    receivedCentavos: Number(row.received_centavos),
    processingFeeCentavos: Number(row.processing_fee_centavos),
    netReceivedCentavos: Number(row.net_received_centavos),
    disbursedCentavos: Number(row.disbursed_centavos),
    status: row.status,
    events: row.audit_entries.map((event) => ({
      id: event.id,
      type: event.entity_type,
      title: event.title,
      detail: event.public_detail,
      amountCentavos: event.amount_centavos
        ? Number(event.amount_centavos)
        : undefined,
      occurredAt: event.occurred_at,
      status: event.status,
      ledgerTxHash: event.ledger_tx_hash ?? undefined,
      evidenceHash: event.evidence_sha256
        ? `0x${event.evidence_sha256.replace(/^0x/, "")}`
        : undefined,
    })),
  };
}

const campaignSelect = `id, slug, title, disaster_name, location, summary, target_beneficiaries, funding_goal_centavos, received_centavos, processing_fee_centavos, net_received_centavos, disbursed_centavos, status, organizations(name), audit_entries(id, entity_type, title, public_detail, amount_centavos, occurred_at, status, ledger_tx_hash, evidence_sha256)`;

export async function loadPublishedCampaigns() {
  const { data, error } = await createPublicSupabaseClient()
    .from("campaigns")
    .select(campaignSelect)
    .in("status", ["published", "closed"])
    .eq("is_demonstration", false)
    .order("published_at", { ascending: false });
  if (error || !data) return [];
  return (data as unknown as CampaignRow[]).map(mapCampaign);
}

export async function loadCampaignBySlug(slug: string) {
  const { data, error } = await createPublicSupabaseClient()
    .from("campaigns")
    .select(campaignSelect)
    .eq("slug", slug)
    .eq("is_demonstration", false)
    .in("status", ["published", "closed"])
    .maybeSingle();
  if (error || !data) return null;
  return mapCampaign(data as unknown as CampaignRow);
}

export async function loadEvidenceRecord(hash: string) {
  const normalized = hash.replace(/^0x/, "").toLowerCase();
  const { data, error } = await createPublicSupabaseClient()
    .from("audit_entries")
    .select(
      "id, title, public_detail, ledger_tx_hash, campaign_id, campaigns(slug,title)",
    )
    .eq("evidence_sha256", normalized)
    .maybeSingle();
  if (error || !data) return null;
  return data;
}
