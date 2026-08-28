import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2.112.4";

type Source = {
  id: string;
  organization_name: string;
  official_source_url: string;
  donation_url: string;
  source_domain: string;
  last_success_at: string;
  consecutive_failures: number;
};

const donationLanguage = /donate|donation|give now|support (our|the|this)|ways to give/i;

Deno.serve(async (request) => {
  if (request.method !== "POST") return new Response("Method not allowed", { status: 405 });

  const projectUrl = Deno.env.get("SUPABASE_URL");
  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  if (!projectUrl || !serviceKey) return Response.json({ error: "Runtime configuration unavailable" }, { status: 500 });

  const suppliedSecret = request.headers.get("x-trackaid-monitor-secret") ?? "";
  const admin = createClient(projectUrl, serviceKey, { auth: { persistSession: false } });
  const { data: secretIsValid } = await admin.rpc("verify_source_monitor_secret", { candidate: suppliedSecret });
  if (!secretIsValid) return new Response("Unauthorized", { status: 401 });

  const { data, error } = await admin
    .from("external_campaign_sources")
    .select("id, organization_name, official_source_url, donation_url, source_domain, last_success_at, consecutive_failures");
  if (error) return Response.json({ error: error.message }, { status: 500 });

  const results = await Promise.all((data as Source[]).map(async (source) => {
    let statusCode: number | null = null;
    let donationCtaFound = false;
    let detail = "";
    try {
      const [sourceResponse, donationResponse] = await Promise.all([
        fetch(source.official_source_url, { redirect: "follow", signal: AbortSignal.timeout(12000) }),
        fetch(source.donation_url, { redirect: "follow", signal: AbortSignal.timeout(12000) }),
      ]);
      statusCode = donationResponse.status;
      const sourceText = (await sourceResponse.text()).slice(0, 600_000);
      const destinationHost = new URL(donationResponse.url).hostname.toLowerCase();
      const recognizedDestination = destinationHost === source.source_domain || destinationHost.endsWith(`.${source.source_domain}`);
      donationCtaFound = sourceResponse.ok && donationResponse.ok && recognizedDestination && donationLanguage.test(sourceText);
      detail = donationCtaFound ? "Official page and recognized donation destination responded successfully." : "Donation call-to-action or recognized destination could not be confirmed.";
    } catch (monitorError) {
      detail = monitorError instanceof Error ? monitorError.message.slice(0, 900) : "Source check failed.";
    }

    const nextFailures = donationCtaFound ? 0 : source.consecutive_failures + 1;
    const failedFor24Hours = !donationCtaFound && Date.now() - new Date(source.last_success_at).getTime() >= 24 * 60 * 60 * 1000;
    await admin.from("external_campaign_sources").update({
      source_health: donationCtaFound ? "healthy" : failedFor24Hours ? "unavailable" : "warning",
      last_checked_at: new Date().toISOString(),
      ...(donationCtaFound ? { last_success_at: new Date().toISOString() } : {}),
      consecutive_failures: nextFailures,
      is_visible: !failedFor24Hours,
    }).eq("id", source.id);
    await admin.from("source_check_logs").insert({
      source_id: source.id,
      status_code: statusCode,
      donation_cta_found: donationCtaFound,
      checked_url: source.official_source_url,
      detail,
    });
    return { organization: source.organization_name, healthy: donationCtaFound, hidden: failedFor24Hours };
  }));

  await admin.from("admin_audit_log").insert({
    action: "official_sources_checked",
    entity_type: "source_monitor",
    entity_id: crypto.randomUUID(),
    detail: { checked: results.length, healthy: results.filter((result) => result.healthy).length, hidden: results.filter((result) => result.hidden).length },
  });

  return Response.json({ ok: true, results });
});
