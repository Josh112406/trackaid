export type OfficialCampaignSource = {
  slug: string;
  organizationName: string;
  title: string;
  location: string;
  summary: string;
  officialSourceUrl: string;
  donationUrl: string;
  sourceDomain: string;
  lastCheckedAt: string;
  sourceHealth: "healthy" | "warning" | "unavailable";
};

export const officialCampaignSources: OfficialCampaignSource[] = [
  {
    slug: "philippine-red-cross",
    organizationName: "Philippine Red Cross",
    title: "Philippine Red Cross donation options",
    location: "Philippines",
    summary:
      "Official donation options published by the Philippine Red Cross for humanitarian response work.",
    officialSourceUrl: "https://redcross.org.ph/ways-to-donate/",
    donationUrl: "https://redcross.org.ph/ways-to-donate/",
    sourceDomain: "redcross.org.ph",
    lastCheckedAt: "2026-08-27T20:13:07+08:00",
    sourceHealth: "healthy",
  },
  {
    slug: "unicef-philippines-urgent-help",
    organizationName: "UNICEF Philippines",
    title: "Urgent help for children and families",
    location: "Philippines",
    summary:
      "An official UNICEF Philippines appeal supporting urgent assistance for children and families.",
    officialSourceUrl: "https://donate.unicef.ph/campaign/urgent-help",
    donationUrl: "https://donate.unicef.ph/campaign/urgent-help",
    sourceDomain: "donate.unicef.ph",
    lastCheckedAt: "2026-08-27T20:13:08+08:00",
    sourceHealth: "healthy",
  },
  {
    slug: "world-vision-philippines-typhoon-relief",
    organizationName: "World Vision Philippines",
    title: "Typhoon relief in the Philippines",
    location: "Philippines",
    summary:
      "Official World Vision Philippines guidance and donation access for typhoon relief response.",
    officialSourceUrl:
      "https://www.worldvision.org.ph/how-to-donate-for-typhoon-relief-philippines/",
    donationUrl: "https://www.worldvision.org.ph/donate/",
    sourceDomain: "worldvision.org.ph",
    lastCheckedAt: "2026-08-27T20:13:07+08:00",
    sourceHealth: "healthy",
  },
  {
    slug: "oxfam-philippines",
    organizationName: "Oxfam",
    title: "Oxfam response work in the Philippines",
    location: "Philippines",
    summary:
      "Official information about Oxfam work in the Philippines with an external Oxfam donation destination.",
    officialSourceUrl:
      "https://www.oxfamamerica.org/explore/countries/philippines/",
    donationUrl: "https://give.oxfamamerica.org/page/26476/donate/1",
    sourceDomain: "oxfamamerica.org",
    lastCheckedAt: "2026-08-27T20:13:07+08:00",
    sourceHealth: "warning",
  },
];

export function findOfficialSource(slug: string) {
  return officialCampaignSources.find((source) => source.slug === slug);
}

export async function loadOfficialCampaignSources() {
  try {
    const { createPublicSupabaseClient } =
      await import("@/lib/supabase/public");
    const { data, error } = await createPublicSupabaseClient()
      .from("external_campaign_sources")
      .select(
        "slug, organization_name, title, location, summary, official_source_url, donation_url, source_domain, last_checked_at, source_health",
      )
      .eq("is_visible", true)
      .order("organization_name");
    if (error || !data?.length) return officialCampaignSources;
    return data.map((source) => ({
      slug: source.slug,
      organizationName: source.organization_name,
      title: source.title,
      location: source.location,
      summary: source.summary,
      officialSourceUrl: source.official_source_url,
      donationUrl: source.donation_url,
      sourceDomain: source.source_domain,
      lastCheckedAt: source.last_checked_at,
      sourceHealth: source.source_health,
    })) satisfies OfficialCampaignSource[];
  } catch {
    return officialCampaignSources;
  }
}
