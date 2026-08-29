import Link from "next/link";
import { ArrowRight, MapPin, ShieldCheck } from "lucide-react";

import { formatPhp, percentOf } from "@/lib/format";
import type { Campaign } from "@/lib/types";

export function CampaignCard({ campaign }: { campaign: Campaign }) {
  const progress = percentOf(
    campaign.receivedCentavos,
    campaign.fundingGoalCentavos,
  );

  return (
    <article className="campaign-card">
      <div className="campaign-card-topline">
        <span className="section-label">TrackAid campaign</span>
        <span className="verified-label">
          <ShieldCheck size={16} aria-hidden="true" /> Verified organization
        </span>
      </div>
      <h3>{campaign.title}</h3>
      <p className="location-line">
        <MapPin size={17} aria-hidden="true" /> {campaign.location}
      </p>
      <p>{campaign.summary}</p>
      <div className="funding-row">
        <div>
          <span>Raised</span>
          <strong>{formatPhp(campaign.receivedCentavos)}</strong>
        </div>
        <div>
          <span>Goal</span>
          <strong>{formatPhp(campaign.fundingGoalCentavos)}</strong>
        </div>
      </div>
      <div
        className="progress-track"
        role="progressbar"
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={progress}
        aria-label={`${progress}% funded`}
      >
        <span style={{ width: `${progress}%` }} />
      </div>
      <Link className="text-link" href={`/campaigns/${campaign.slug}`}>
        Open the public audit trail <ArrowRight size={17} aria-hidden="true" />
      </Link>
    </article>
  );
}
