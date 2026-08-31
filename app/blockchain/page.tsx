import {
  ArrowUpRight,
  Blocks,
  FileKey2,
  Radio,
  ShieldCheck,
} from "lucide-react";

import { solanaAddressUrl } from "@/lib/ledger-record";

export default function BlockchainPage() {
  const address = process.env.SOLANA_LEDGER_SIGNER_ADDRESS;
  return (
    <main id="main-content" className="simple-page content-page">
      <span className="section-label">Solana audit layer</span>
      <h1>PHP stays off-chain. Proof lands on Solana.</h1>
      <p className="page-lede">
        TrackAid writes a signed accounting memo for each reviewed event on
        Solana Devnet. The memo mirrors the exact PHP centavo value but never
        receives money, creates a token, or converts a donation to
        cryptocurrency.
      </p>
      <div className="feature-grid">
        <article>
          <Blocks size={28} />
          <h2>One peso record</h2>
          <p>
            One PHP remains one PHP. The ledger stores integer centavos beside a
            record fingerprint for public reconciliation.
          </p>
        </article>
        <article>
          <FileKey2 size={28} />
          <h2>Minimal disclosure</h2>
          <p>
            Only record identifiers, amounts, and SHA-256 fingerprints are
            published. Donor identity and private evidence stay protected.
          </p>
        </article>
        <article>
          <ShieldCheck size={28} />
          <h2>TrackAid pays network fees</h2>
          <p>
            A dedicated recorder signs each memo and pays the Devnet fee. A
            donor never needs a wallet or SOL.
          </p>
        </article>
      </div>
      {address ? (
        <section
          className="solana-recorder-card"
          aria-labelledby="recorder-title"
        >
          <div className="solana-recorder-heading">
            <div>
              <span className="solana-network-label">
                <Radio size={16} aria-hidden="true" />
                Solana Devnet
              </span>
              <h2 id="recorder-title">Public ledger recorder</h2>
            </div>
            <span className="solana-recorder-state">
              <span aria-hidden="true" />
              Address configured
            </span>
          </div>
          <div className="solana-address-block">
            <span>Recorder address</span>
            <code>{address}</code>
          </div>
          <a
            className="primary-button solana-explorer-link"
            href={solanaAddressUrl(address)}
            target="_blank"
            rel="noopener noreferrer"
          >
            View on Solana Explorer
            <ArrowUpRight size={17} aria-hidden="true" />
          </a>
        </section>
      ) : (
        <div className="empty-state compact-empty">
          <h3>Public recorder address unavailable</h3>
          <p>
            The public ledger address is not configured for this deployment.
          </p>
        </div>
      )}
    </main>
  );
}
