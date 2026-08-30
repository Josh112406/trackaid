import {
  BadgeCheck,
  FileLock2,
  HandCoins,
  MessageSquareCheck,
} from "lucide-react";

import styles from "./page.module.css";

export default function HowItWorksPage() {
  return (
    <main id="main-content" className="simple-page content-page">
      <span className="section-label">How it works</span>
      <h1>One chain of custody from payment to proof.</h1>
      <p className="page-lede">
        TrackAid separates payment processing, evidence review, and public
        integrity anchoring so each layer can be checked on its own.
      </p>
      <ol
        className={`how-grid ${styles.workflow}`}
        aria-label="TrackAid workflow"
      >
        <li className={styles.card}>
          <span className={styles.number}>01</span>
          <BadgeCheck className={styles.icon} size={28} />
          <h3 className={styles.title}>Verify organizations</h3>
          <p className={styles.description}>
            Review official domains, legal authority, representatives, and
            registered payout accounts.
          </p>
        </li>
        <li className={styles.card}>
          <span className={styles.number}>02</span>
          <HandCoins className={styles.icon} size={28} />
          <h3 className={styles.title}>Reconcile PayMongo</h3>
          <p className={styles.description}>
            A signed webhook—not a browser redirect—marks a donation as paid.
          </p>
        </li>
        <li className={styles.card}>
          <span className={styles.number}>03</span>
          <FileLock2 className={styles.icon} size={28} />
          <h3 className={styles.title}>Protect evidence</h3>
          <p className={styles.description}>
            Private files remain in access-controlled storage while SHA-256
            fingerprints become auditable.
          </p>
        </li>
        <li className={styles.card}>
          <span className={styles.number}>04</span>
          <MessageSquareCheck className={styles.icon} size={28} />
          <h3 className={styles.title}>Anchor and confirm</h3>
          <p className={styles.description}>
            Reviewed events are anchored to the ledger and can be supported or
            disputed by real-world parties.
          </p>
        </li>
      </ol>
    </main>
  );
}
