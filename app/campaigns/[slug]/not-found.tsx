import Link from "next/link";

export default function CampaignNotFound() {
  return (
    <main id="main-content" className="simple-page">
      <span className="eyebrow">Campaign not found</span>
      <h1>This public record is not available.</h1>
      <p>The link may be incomplete or the campaign may not be published.</p>
      <Link className="primary-button" href="/campaigns">
        View campaigns
      </Link>
    </main>
  );
}
