import { createServerUserClient } from "@/lib/supabase/server";

export type AdminData = {
  campaigns: Array<Record<string, unknown>>;
  donations: Array<Record<string, unknown>>;
  disbursements: Array<Record<string, unknown>>;
  submissions: Array<Record<string, unknown>>;
  proofs: Array<Record<string, unknown>>;
  sources: Array<Record<string, unknown>>;
  sourceChecks: Array<Record<string, unknown>>;
  ledgerJobs: Array<Record<string, unknown>>;
  auditEntries: Array<Record<string, unknown>>;
  analytics: Array<Record<string, unknown>>;
  adminAudit: Array<Record<string, unknown>>;
  webhookEvents: Array<Record<string, unknown>>;
  connected: boolean;
};

export async function loadAdminData(): Promise<AdminData> {
  const supabase = await createServerUserClient();
  const results = await Promise.all([
    supabase
      .from("campaigns")
      .select(
        "id,title,slug,status,received_centavos,disbursed_centavos,funding_goal_centavos,created_at",
      )
      .order("created_at", { ascending: false }),
    supabase
      .from("donations")
      .select(
        "id,campaign_id,paymongo_payment_id,paymongo_payment_intent_id,amount_centavos,status,paid_at,created_at,campaigns(title)",
      )
      .order("created_at", { ascending: false })
      .limit(100),
    supabase
      .from("disbursements")
      .select(
        "id,campaign_id,purpose,amount_centavos,status,occurred_at,campaigns(title)",
      )
      .order("occurred_at", { ascending: false })
      .limit(100),
    supabase
      .from("program_submissions")
      .select(
        "id,organization_name,program_name,status,official_domain,created_at,submitted_at,reviewed_at",
      )
      .order("created_at", { ascending: false })
      .limit(100),
    supabase
      .from("program_proofs")
      .select(
        "id,submission_id,kind,label,public_url,private_object_path,sha256,is_identity_proof,created_at",
      )
      .order("created_at", { ascending: false })
      .limit(200),
    supabase
      .from("external_campaign_sources")
      .select(
        "id,slug,organization_name,title,source_domain,source_health,is_visible,last_checked_at,official_source_url,donation_url",
      )
      .order("organization_name"),
    supabase
      .from("source_check_logs")
      .select("id,source_id,status_code,donation_cta_found,detail,checked_at")
      .order("checked_at", { ascending: false })
      .limit(100),
    supabase
      .from("ledger_jobs")
      .select(
        "id,entity_type,entity_id,campaign_id,amount_centavos,payload_hash,status,attempts,tx_hash,last_error,created_at,updated_at",
      )
      .order("created_at", { ascending: false })
      .limit(100),
    supabase
      .from("audit_entries")
      .select(
        "id,campaign_id,entity_type,entity_id,title,amount_centavos,status,ledger_tx_hash,evidence_sha256,occurred_at",
      )
      .order("occurred_at", { ascending: false })
      .limit(100),
    supabase
      .from("analytics_events")
      .select(
        "id,event_kind,campaign_id,external_source_id,path,amount_centavos,occurred_at",
      )
      .order("occurred_at", { ascending: false })
      .limit(500),
    supabase
      .from("admin_audit_log")
      .select("id,action,entity_type,entity_id,created_at")
      .order("created_at", { ascending: false })
      .limit(100),
    supabase
      .from("webhook_events")
      .select("id,event_type,status,processing_error,received_at,processed_at")
      .order("received_at", { ascending: false })
      .limit(100),
  ]);

  const firstError = results.find((result) => result.error)?.error;
  if (firstError) console.error("Admin data query failed", firstError.message);
  const rows = (index: number) =>
    (results[index].data ?? []) as Array<Record<string, unknown>>;
  return {
    campaigns: rows(0),
    donations: rows(1),
    disbursements: rows(2),
    submissions: rows(3),
    proofs: rows(4),
    sources: rows(5),
    sourceChecks: rows(6),
    ledgerJobs: rows(7),
    auditEntries: rows(8),
    analytics: rows(9),
    adminAudit: rows(10),
    webhookEvents: rows(11),
    connected: !firstError,
  };
}

export function sumCentavos(
  rows: Array<Record<string, unknown>>,
  field: string,
) {
  return rows.reduce((sum, row) => sum + Number(row[field] ?? 0), 0);
}
