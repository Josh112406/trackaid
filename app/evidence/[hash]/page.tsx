import Link from "next/link";
import {
  ArrowLeft,
  ArrowUpRight,
  Fingerprint,
  ShieldCheck,
} from "lucide-react";
import { notFound } from "next/navigation";

import { findDemoEvidenceRecord } from "@/lib/demo-data";

const SHA256_PATTERN = /^0x[0-9a-f]{64}$/i;

export default async function EvidenceRecordPage({
  params,
}: {
  params: Promise<{ hash: string }>;
}) {
  const { hash } = await params;
  if (!SHA256_PATTERN.test(hash)) notFound();
  const record = findDemoEvidenceRecord(hash);
  const anchoringTransaction = record?.event.ledgerTxHash;
  const explorerUrl = anchoringTransaction
    ? `https://amoy.polygonscan.com/tx/${anchoringTransaction}`
    : `https://amoy.polygonscan.com/search?f=0&q=${encodeURIComponent(hash)}`;

  return (
    <main id="main-content" className="simple-page evidence-record-page">
      <Link className="back-link" href="/#audit">
        <ArrowLeft size={17} aria-hidden="true" /> Back to public audit
      </Link>
      <section className="evidence-record">
        <div className="evidence-record-icon" aria-hidden="true">
          <Fingerprint size={34} />
        </div>
        <span className="demo-label">Demonstration integrity record</span>
        <h1>Evidence hash</h1>
        <p>
          This fingerprint lets an auditor compare a private evidence file with
          the public record without publishing the receipt, permit, or personal
          information itself.
        </p>
        <a
          className="evidence-hash-explorer"
          href={explorerUrl}
          target="_blank"
          rel="noopener noreferrer"
          aria-label={
            anchoringTransaction
              ? "Open the anchoring transaction on Polygon Amoy"
              : "Search this evidence hash on the Polygon Amoy explorer"
          }
        >
          <code>{hash}</code>
          <ArrowUpRight size={19} aria-hidden="true" />
        </a>
        <div className="evidence-record-note">
          <ShieldCheck size={20} aria-hidden="true" />
          <p>
            {anchoringTransaction
              ? "Open PolygonScan to inspect the demonstration anchoring transaction identifier."
              : "No anchoring transaction is recorded for this submitted demonstration item yet. The link searches Polygon Amoy and may return no result until a real transaction exists."}
          </p>
        </div>
        {record ? (
          <Link
            className="text-link evidence-campaign-link"
            href={`/campaigns/${record.campaign.slug}`}
          >
            View the related campaign audit trail
            <ArrowUpRight size={16} aria-hidden="true" />
          </Link>
        ) : null}
      </section>
    </main>
  );
}
