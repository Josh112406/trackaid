import {
  ArrowUpRight,
  Clock3,
  ExternalLink,
  MapPin,
  ShieldCheck,
} from "lucide-react";

import type { OfficialCampaignSource } from "@/lib/official-sources";

export function OfficialCampaignCard({
  source,
}: {
  source: OfficialCampaignSource;
}) {
  const checked = new Intl.DateTimeFormat("en-PH", {
    dateStyle: "medium",
    timeStyle: "short",
    timeZone: "Asia/Manila",
  }).format(new Date(source.lastCheckedAt));

  return (
    <article className="official-campaign-card">
      <div className="official-source-line">
        <span>
          <ShieldCheck size={16} aria-hidden="true" /> Official-source listing
        </span>
        <span className={`source-health source-health-${source.sourceHealth}`}>
          {source.sourceHealth}
        </span>
      </div>
      <h3>{source.title}</h3>
      <p className="location-line">
        <MapPin size={17} aria-hidden="true" /> {source.location}
      </p>
      <p>{source.summary}</p>
      <dl className="source-metadata">
        <div>
          <dt>Organization</dt>
          <dd>{source.organizationName}</dd>
        </div>
        <div>
          <dt>Source</dt>
          <dd>{source.sourceDomain}</dd>
        </div>
        <div>
          <dt>
            <Clock3 size={14} aria-hidden="true" /> Last checked
          </dt>
          <dd>{checked}</dd>
        </div>
      </dl>
      <div className="source-actions">
        <a
          className="primary-button"
          href={`/go/${source.slug}`}
          target="_blank"
          rel="noopener noreferrer"
        >
          Donate on official site <ArrowUpRight size={17} aria-hidden="true" />
        </a>
        <a
          className="text-link"
          href={source.officialSourceUrl}
          target="_blank"
          rel="noopener noreferrer"
        >
          Review source <ExternalLink size={15} aria-hidden="true" />
        </a>
      </div>
      <p className="external-disclaimer">
        Payment happens on the organization’s website. TrackAid does not receive
        or verify that external transaction.
      </p>
    </article>
  );
}
