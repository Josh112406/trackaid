import { OfficialCampaignCard } from "@/components/official-campaign-card";
import { loadOfficialCampaignSources } from "@/lib/official-sources";
export const revalidate = 300;
export default async function OfficialSourcesPage() {
  const sources = await loadOfficialCampaignSources();
  return (
    <main id="main-content" className="simple-page content-page">
      <span className="demo-label">Official sources</span>
      <h1>Donation pages owned by relief organizations.</h1>
      <p className="page-lede">
        TrackAid monitors these official destinations for availability and
        donation-language signals. Payments remain outside TrackAid and are not
        included in its transaction totals.
      </p>
      <div className="official-campaign-grid">
        {sources.map((s) => (
          <OfficialCampaignCard key={s.slug} source={s} />
        ))}
      </div>
    </main>
  );
}
