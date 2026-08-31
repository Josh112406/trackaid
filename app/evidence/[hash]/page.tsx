import Link from "next/link";
import {
  ArrowLeft,
  ArrowUpRight,
  Fingerprint,
  ShieldCheck,
} from "lucide-react";
import { notFound } from "next/navigation";
import { loadEvidenceRecord } from "@/lib/campaigns";
import { ledgerTransactionUrl } from "@/lib/ledger-record";

const SHA256_PATTERN = /^0x[0-9a-f]{64}$/i;
export default async function EvidenceRecordPage({
  params,
}: {
  params: Promise<{ hash: string }>;
}) {
  const { hash } = await params;
  if (!SHA256_PATTERN.test(hash)) notFound();
  const record = await loadEvidenceRecord(hash);
  if (!record) notFound();
  const tx = record.ledger_tx_hash;
  const explorer = tx ? ledgerTransactionUrl(tx) : null;
  const campaign = record.campaigns as unknown as {
    slug: string;
    title: string;
  } | null;
  return (
    <main id="main-content" className="simple-page evidence-record-page">
      <Link className="back-link" href="/public-audit">
        <ArrowLeft size={17} /> Back to public audit
      </Link>
      <section className="evidence-record">
        <div className="evidence-record-icon">
          <Fingerprint size={34} />
        </div>
        <span className="section-label">Integrity record</span>
        <h1>Evidence hash</h1>
        <p>{record.public_detail}</p>
        {explorer ? (
          <a
            className="evidence-hash-explorer"
            href={explorer}
            target="_blank"
            rel="noopener noreferrer"
          >
            <code>{hash}</code>
            <ArrowUpRight size={19} />
          </a>
        ) : (
          <div className="evidence-hash-explorer">
            <code>{hash}</code>
          </div>
        )}
        <div className="evidence-record-note">
          <ShieldCheck size={20} />
          <p>
            {tx
              ? "Open the public explorer to inspect the signed transaction that anchored this fingerprint."
              : "This fingerprint is recorded, but an on-chain transaction has not been confirmed yet."}
          </p>
        </div>
        {campaign ? (
          <Link
            className="text-link evidence-campaign-link"
            href={`/campaigns/${campaign.slug}`}
          >
            View {campaign.title}
            <ArrowUpRight size={16} />
          </Link>
        ) : null}
      </section>
    </main>
  );
}
