# TrackAid

TrackAid is a public accountability platform for Philippine disaster-relief fundraising. It connects verified campaigns, PayMongo-hosted payments, evidence review, public reconciliation, and signed Solana ledger records.

**Production:** [trackaid.vercel.app](https://trackaid.vercel.app)

**Repository:** [github.com/Josh112406/trackaid](https://github.com/Josh112406/trackaid)

## What TrackAid does

- Lets organizations and community members submit fundraising programs with public proof.
- Requires organization verification before a campaign can accept donations.
- Sends donors to PayMongo Checkout, so TrackAid never receives card or wallet credentials.
- Reconciles every confirmed donation into gross PHP amount, PayMongo fee, and net recipient amount.
- Supports PayMongo Split Payments for approved organization merchant accounts.
- Publishes campaign totals, disbursements, evidence fingerprints, and public ledger links.
- Writes exact PHP-centavo accounting records and SHA-256 fingerprints to Solana Devnet.
- Provides authenticated administration, analytics, CSV reports, audit logs, and payout routing.

TrackAid does **not** create a token or convert PHP to cryptocurrency. One peso paid remains one peso in the PayMongo settlement flow. The Solana memo is a signed accounting representation only; it cannot receive, hold, or transfer the donation.

## System flow

```text
Program submission
        │
        ▼
Evidence and organization review ──► payout verification
        │
        ▼
Published campaign
        │
        ▼
PayMongo Checkout ──► PHP settlement to approved recipient
        │
        ▼
Signed webhook reconciliation
        │
        ├──► Supabase: gross, fee, net, audit entry, analytics
        │
        └──► Solana Devnet: record ID, PHP centavos, SHA-256 fingerprint
```

The browser redirect is never treated as payment proof. A donation becomes paid only after the server verifies a PayMongo event and matches its campaign, checkout, donation, environment, and amount.

## Technology

| Layer                             | Technology                                           |
| --------------------------------- | ---------------------------------------------------- |
| Web application                   | Next.js 16 App Router, React 19, TypeScript          |
| Database, authentication, storage | Supabase Postgres, Auth, Storage, Row Level Security |
| Payments                          | PayMongo Checkout API v2 and signed webhooks         |
| Public integrity ledger           | Solana Kit and the public Memo program on Devnet     |
| Hosting                           | Vercel                                               |
| Tests                             | Vitest and Playwright                                |

## Project structure

```text
app/                  Next.js pages, admin views, and route handlers
components/           Shared public and administrative UI
lib/                  Payments, reconciliation, Supabase, CSV, and ledger logic
scripts/              Browser and operational verification
supabase/migrations/  Database schema, policies, triggers, and security controls
supabase/functions/   Official-source monitoring function
vercel.json           Scheduled ledger processing
```

## Local setup

Requirements: Node.js 22+, pnpm 11, Supabase, PayMongo, and Vercel projects.

1. Install dependencies.

   ```bash
   git clone https://github.com/Josh112406/trackaid.git
   cd trackaid
   pnpm install
   ```

2. Create `.env.local`. Never commit this file.

   ```dotenv
   NEXT_PUBLIC_SITE_URL=http://localhost:3000

   NEXT_PUBLIC_SUPABASE_URL=https://YOUR_PROJECT.supabase.co
   NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=YOUR_PUBLISHABLE_KEY
   SUPABASE_SECRET_KEY=YOUR_SERVER_SECRET_KEY

   PAYMONGO_SECRET_KEY=YOUR_SECRET_KEY
   PAYMONGO_WEBHOOK_SECRET=YOUR_WEBHOOK_SECRET
   PAYMONGO_LIVE_MODE=false

   SOLANA_DEVNET_RPC_URL=https://api.devnet.solana.com
   SOLANA_LEDGER_SIGNER_ADDRESS=YOUR_PUBLIC_SOLANA_ADDRESS
   SOLANA_LEDGER_SECRET_KEY=YOUR_BASE64_64_BYTE_SECRET

   CRON_SECRET=USE_A_LONG_RANDOM_VALUE
   ```

3. Link Supabase and apply the migrations.

   ```bash
   pnpm exec supabase login
   pnpm exec supabase link --project-ref YOUR_PROJECT_REF
   pnpm exec supabase db push
   ```

4. Run the app.

   ```bash
   pnpm dev
   ```

## Environment variables

| Variable                               | Scope        | Purpose                                    |
| -------------------------------------- | ------------ | ------------------------------------------ |
| `NEXT_PUBLIC_SITE_URL`                 | Public       | Stable origin used in PayMongo return URLs |
| `NEXT_PUBLIC_SUPABASE_URL`             | Public       | Supabase project API URL                   |
| `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` | Public       | Browser-safe key protected by RLS          |
| `SUPABASE_SECRET_KEY`                  | Server only  | Trusted database administration            |
| `PAYMONGO_SECRET_KEY`                  | Server only  | PayMongo API authentication                |
| `PAYMONGO_WEBHOOK_SECRET`              | Server only  | Verifies the `Paymongo-Signature` header   |
| `PAYMONGO_LIVE_MODE`                   | Server only  | Must match the configured PayMongo keys    |
| `SOLANA_DEVNET_RPC_URL`                | Server only  | Solana Devnet JSON-RPC endpoint            |
| `SOLANA_LEDGER_SIGNER_ADDRESS`         | Public value | Dedicated ledger recorder address          |
| `SOLANA_LEDGER_SECRET_KEY`             | Server only  | Base64-encoded 64-byte signing key         |
| `SECURITY_HASH_PEPPER`                 | Server only  | Optional dedicated rate-limit HMAC key     |
| `CRON_SECRET`                          | Server only  | Authorizes the scheduled ledger worker     |

Never prefix secrets with `NEXT_PUBLIC_`. The Supabase Edge Function uses the platform-provided `SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY`.

## Supabase and authorization

Migrations define verified organizations, campaigns, donations, disbursements, confirmations, program submissions, audit entries, administrator roles, PayMongo idempotency, payout destinations, and queued ledger jobs.

Row Level Security is enabled on all exposed operational tables. Sensitive mutations use server-only data-access modules and recheck administrator authorization. Private evidence remains in access-controlled Storage; public pages receive only fingerprints and redacted context.

Review controls include:

- reviewers cannot approve their own submission;
- a sole owner override is allowed and permanently logged;
- payout destinations require separation between submission and approval;
- donations are blocked when no active organization payout destination exists; and
- every approval and ledger confirmation enters the administrator audit log.

## PayMongo setup and payment verification

1. Add the matching PayMongo secret key and environment flag.
2. Create `https://YOUR_DOMAIN/api/webhooks/paymongo` in the PayMongo dashboard.
3. Subscribe to `checkout_session.payment.paid`.
4. Store the webhook signing secret in `PAYMONGO_WEBHOOK_SECRET`.
5. Configure an approved PayMongo organization destination for direct settlement.

For development payment checks, use PayMongo's documented cards:

| Scenario           | Card number           | Result                       |
| ------------------ | --------------------- | ---------------------------- |
| Successful card    | `4343 4343 4343 4345` | Payment succeeds without 3DS |
| 3D Secure          | `4120 0000 0000 0007` | Select **Authorize**         |
| Insufficient funds | `5100 0000 0000 0198` | Payment is declined          |

Use any future expiry and any three-digit CVC. After PayMongo redirects back, verify the signed webhook result in the campaign audit trail, **Admin → Transactions**, and **Admin → Blockchain**.

Official references:

- [Hosted Checkout](https://docs.paymongo.com/docs/payment-channels-hosted-checkout)
- [Payment acceptance testing](https://docs.paymongo.com/docs/payment-acceptance-testing)
- [Webhooks](https://docs.paymongo.com/docs/creating-a-webhook-endpoint)
- [Split Payments](https://docs.paymongo.com/docs/seeds-payment-splitting)

## Solana integrity ledger

TrackAid uses Solana's public Memo program rather than a custom token or value-transfer contract. Each successful record contains:

- protocol and version identifiers;
- record type and UUID;
- campaign or submission UUID;
- exact PHP amount in integer centavos;
- currency `PHP` and `funds: offchain`; and
- the SHA-256 payload fingerprint.

The dedicated recorder is included as a required memo signer, so the public transaction proves which TrackAid key submitted it. The memo contains no donor name, bank data, PayMongo secret, receipt, or private evidence. TrackAid pays the small Devnet transaction fee; donors need no wallet and no SOL.

`ledger_jobs` stores signed transaction signatures before submission and checks previous signatures before retrying. Existing historical EVM transaction hashes remain valid and continue to open in their original explorer, while new entries open in Solana Explorer.

## Commands

| Command             | Purpose                   |
| ------------------- | ------------------------- |
| `pnpm dev`          | Start the development app |
| `pnpm build`        | Create a production build |
| `pnpm start`        | Run the production build  |
| `pnpm typecheck`    | Check TypeScript          |
| `pnpm lint`         | Run ESLint                |
| `pnpm test`         | Run Vitest                |
| `pnpm format:check` | Check formatting          |

## Deployment

Production deploys from `main` to Vercel.

1. Apply Supabase migrations.
2. Add production environment variables in Vercel; mark signer and provider keys as sensitive.
3. Deploy the exact commit that passed lint, formatting, type checking, tests, and `pnpm build`.
4. Verify PayMongo webhook rejection for invalid signatures and authorization on the scheduled ledger endpoint.
5. Confirm the public recorder address and at least one signed ledger transaction in Solana Explorer.

`vercel.json` runs the ledger worker daily. A reconciled PayMongo webhook also attempts one ledger job immediately.

## Security and privacy

- Never commit `.env*`, provider keys, webhook secrets, RPC credentials, or signing keys.
- Payment details are entered only on PayMongo's hosted page.
- Webhook signatures and event IDs are verified before donation state changes.
- Amounts are reconciled as integer centavos, never floating-point pesos.
- Evidence files remain private; public records expose only redacted details and fingerprints.
- Blockchain records prove that a signed value and fingerprint were published, not that an off-chain purchase or delivery was truthful.
- Run Supabase security/performance advisors and dependency audits after schema or package changes.

Before accepting live donations, complete payment-provider activation and compliance, enable all available Supabase password protections, verify webhook retry behavior, protect the Solana key in managed secrets, and commission an independent security review.

## Development workflow

- Preserve existing user and payment data.
- Add tests for payment, authorization, reconciliation, and ledger behavior.
- Run `pnpm format:check`, `pnpm lint`, `pnpm typecheck`, `pnpm test`, and `pnpm build` before release.
- Use Conventional Commits such as `feat:`, `fix:`, `docs:`, `test:`, `refactor:`, or `chore:`.
- Never commit generated builds, dependencies, local environments, or credentials.
