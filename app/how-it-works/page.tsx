import {
  BadgeCheck,
  FileLock2,
  HandCoins,
  MessageSquareCheck,
} from "lucide-react";
export default function HowItWorksPage() {
  return (
    <main id="main-content" className="simple-page content-page">
      <span className="demo-label">How it works</span>
      <h1>One chain of custody from payment to proof.</h1>
      <p className="page-lede">
        TrackAid separates payment processing, evidence review, and public
        integrity anchoring so each layer can be checked on its own.
      </p>
      <ol className="how-grid">
        <li>
          <span>01</span>
          <BadgeCheck size={28} />
          <h3>Verify organizations</h3>
          <p>
            Review official domains, legal authority, representatives, and
            registered payout accounts.
          </p>
        </li>
        <li>
          <span>02</span>
          <HandCoins size={28} />
          <h3>Reconcile PayMongo</h3>
          <p>
            A signed webhook—not a browser redirect—marks a donation as paid.
          </p>
        </li>
        <li>
          <span>03</span>
          <FileLock2 size={28} />
          <h3>Protect evidence</h3>
          <p>
            Private files remain in access-controlled storage while SHA-256
            fingerprints become auditable.
          </p>
        </li>
        <li>
          <span>04</span>
          <MessageSquareCheck size={28} />
          <h3>Anchor and confirm</h3>
          <p>
            Reviewed events are anchored to the ledger and can be supported or
            disputed by real-world parties.
          </p>
        </li>
      </ol>
    </main>
  );
}
