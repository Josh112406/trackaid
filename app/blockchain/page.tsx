import { ArrowUpRight, Blocks, FileKey2, ShieldCheck } from "lucide-react";
export default function BlockchainPage() {
  const address = process.env.TRACKAID_LEDGER_ADDRESS;
  return (
    <main id="main-content" className="simple-page content-page">
      <span className="section-label">Blockchain audit layer</span>
      <h1>Hashes on-chain. Donations in pesos.</h1>
      <p className="page-lede">
        The TrackAidLedger contract is an append-only EVM audit log. It never
        receives funds, stores documents, or asks donors to hold cryptocurrency.
      </p>
      <div className="feature-grid">
        <article>
          <Blocks size={28} />
          <h2>Append-only records</h2>
          <p>Duplicate record identifiers are rejected by the contract.</p>
        </article>
        <article>
          <FileKey2 size={28} />
          <h2>Minimal disclosure</h2>
          <p>
            Only identifiers, amounts in centavos, kinds, and payload hashes are
            emitted.
          </p>
        </article>
        <article>
          <ShieldCheck size={28} />
          <h2>Controlled recorder</h2>
          <p>
            Owner and recorder roles use two-step transfers to reduce mistakes.
          </p>
        </article>
      </div>
      {address ? (
        <a
          className="primary-button"
          href={`https://amoy.polygonscan.com/address/${address}`}
          target="_blank"
          rel="noopener noreferrer"
        >
          Open contract on PolygonScan <ArrowUpRight size={17} />
        </a>
      ) : (
        <div className="empty-state compact-empty">
          <h3>Contract deployment pending</h3>
          <p>
            The reviewed contract is ready, but no public address is configured
            for this environment.
          </p>
        </div>
      )}
    </main>
  );
}
