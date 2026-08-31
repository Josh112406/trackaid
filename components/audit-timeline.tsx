import {
  ArrowUpRight,
  Check,
  CircleDot,
  FileCheck2,
  HandCoins,
  PackageCheck,
  Users,
} from "lucide-react";
import Link from "next/link";

import { formatDateTime, formatPhp } from "@/lib/format";
import { ledgerTransactionUrl } from "@/lib/ledger-record";
import type { AuditEvent } from "@/lib/types";

const iconByType = {
  donation: HandCoins,
  disbursement: FileCheck2,
  beneficiary_confirmation: Users,
  supplier_confirmation: PackageCheck,
};

function shortHash(hash: string) {
  return `${hash.slice(0, 10)}…${hash.slice(-8)}`;
}

export function AuditTimeline({ events }: { events: AuditEvent[] }) {
  return (
    <ol className="audit-timeline">
      {events.map((event) => {
        const Icon = iconByType[event.type];
        const ledgerUrl = event.ledgerTxHash
          ? ledgerTransactionUrl(event.ledgerTxHash)
          : null;
        return (
          <li key={event.id}>
            <div className="thread-marker" aria-hidden="true">
              <Icon size={20} />
            </div>
            <article className="audit-event">
              <div className="audit-event-heading">
                <div>
                  <span className={`status-pill status-${event.status}`}>
                    {event.status === "confirmed" ? (
                      <Check size={14} />
                    ) : (
                      <CircleDot size={14} />
                    )}
                    {event.status}
                  </span>
                  <h3>{event.title}</h3>
                </div>
                {event.amountCentavos ? (
                  <strong>{formatPhp(event.amountCentavos)}</strong>
                ) : null}
              </div>
              <p>{event.detail}</p>
              <dl className="audit-metadata">
                <div>
                  <dt>Recorded</dt>
                  <dd>{formatDateTime(event.occurredAt)}</dd>
                </div>
                {event.ledgerTxHash && ledgerUrl ? (
                  <div>
                    <dt>Ledger transaction</dt>
                    <dd>
                      <a
                        className="hash-link"
                        href={ledgerUrl}
                        rel="noopener noreferrer"
                        target="_blank"
                        title={event.ledgerTxHash}
                      >
                        {shortHash(event.ledgerTxHash)}
                        <ArrowUpRight size={14} aria-hidden="true" />
                        <span className="sr-only">
                          Open public ledger transaction
                        </span>
                      </a>
                    </dd>
                  </div>
                ) : null}
                {event.evidenceHash ? (
                  <div>
                    <dt>Evidence hash</dt>
                    <dd>
                      <Link
                        className="hash-link"
                        href={`/evidence/${event.evidenceHash}`}
                        title={event.evidenceHash}
                      >
                        {shortHash(event.evidenceHash)}
                        <ArrowUpRight size={14} aria-hidden="true" />
                        <span className="sr-only">
                          Open evidence integrity record
                        </span>
                      </Link>
                    </dd>
                  </div>
                ) : null}
              </dl>
            </article>
          </li>
        );
      })}
    </ol>
  );
}
