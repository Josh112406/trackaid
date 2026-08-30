# TrackAid

TrackAid is a public accountability platform for Philippine disaster-relief fundraising. It connects verified campaigns, PayMongo-hosted payments, evidence review, public reconciliation, and an append-only Polygon audit trail.

**Production:** [trackaid.vercel.app](https://trackaid.vercel.app)

**Repository:** [github.com/Josh112406/trackaid](https://github.com/Josh112406/trackaid)

## What TrackAid does

- Lets organizations and community members submit fundraising programs with public proof.
- Requires organization verification before a campaign can accept on-platform donations.
- Sends donors to PayMongo's hosted checkout, so TrackAid never receives card or wallet credentials.
- Reconciles each confirmed donation into gross amount, PayMongo fee, and net recipient amount.
- Supports PayMongo Split Payments for independently approved organization merchant accounts.
- Publishes campaign totals, disbursements, evidence fingerprints, and transaction links.
- Anchors exact PHP centavo amounts and SHA-256 fingerprints on Polygon Amoy.
- Provides authenticated administration, analytics, CSV reports, audit logs, and payout routing.

TrackAid does **not** convert donations to cryptocurrency. Fiat remains in Philippine pesos. The smart contract is an integrity ledger only; it cannot receive, hold, or transfer funds.

## System flow

```text
Program submission
        │
        ▼
Independent review ──► Organization and payout verification
        │
        ▼
Published campaign
        │
        ▼
PayMongo hosted checkout ──► PHP settlement to approved recipient
        │
        ▼
Signed webhook reconciliation
        │
        ├──► Supabase: gross, fee, net, audit entry, analytics
        │
        └──► Polygon Amoy: record ID, centavo amount, payload hash
```

The browser redirect is not treated as payment proof. A donation becomes paid only after the server verifies a PayMongo event and matches it to the pending checkout.

## Technology

| Layer                             | Technology                                           |
| --------------------------------- | ---------------------------------------------------- |
| Web application                   | Next.js 16 App Router, React 19, TypeScript          |
| Database, authentication, storage | Supabase Postgres, Auth, Storage, Row Level Security |
| Payments                          | PayMongo Checkout API v2 and signed webhooks         |
| Audit ledger                      | Solidity 0.8.36, Polygon Amoy, viem                  |
| Hosting                           | Vercel                                               |
| Tests                             | Vitest and Playwright                                |

## Project structure

```text
app/                         Next.js pages, admin views, and API routes
components/                  Shared public and administrative UI
contracts/TrackAidLedger.sol Append-only audit smart contract
lib/                         Payments, reconciliation, Supabase, CSV, and ledger logic
scripts/                     Contract compilation and browser verification
supabase/migrations/         Database schema, policies, triggers, and security controls
supabase/functions/          Official-source monitoring function
vercel.json                  Scheduled ledger processing
```

## Prerequisites

- Node.js 22 or newer
- pnpm 11
- A Supabase project
- A PayMongo account with test API keys
- A Polygon Amoy RPC endpoint and funded recorder wallet for on-chain anchoring
- A Vercel project for production deployment

## Local setup

1. Clone and install dependencies.

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

   PAYMONGO_SECRET_KEY=YOUR_TEST_SECRET_KEY
   PAYMONGO_WEBHOOK_SECRET=YOUR_TEST_WEBHOOK_SECRET
   PAYMONGO_LIVE_MODE=false

   POLYGON_AMOY_RPC_URL=https://YOUR_AMOY_RPC_ENDPOINT
   TRACKAID_LEDGER_ADDRESS=0xYOUR_DEPLOYED_CONTRACT
   TRACKAID_RECORDER_PRIVATE_KEY=0xYOUR_RECORDER_PRIVATE_KEY

   CRON_SECRET=USE_A_LONG_RANDOM_VALUE
   ```

3. Link Supabase and apply the migrations.

   ```bash
   pnpm exec supabase login
   pnpm exec supabase link --project-ref YOUR_PROJECT_REF
   pnpm exec supabase db push
   ```

4. Start the application.

   ```bash
   pnpm dev
   ```

5. Open [http://localhost:3000](http://localhost:3000).

### Environment variables

| Variable                               | Required      | Purpose                                         |
| -------------------------------------- | ------------- | ----------------------------------------------- |
| `NEXT_PUBLIC_SITE_URL`                 | Production    | Stable origin used in PayMongo return URLs      |
| `NEXT_PUBLIC_SUPABASE_URL`             | Yes           | Supabase project API URL                        |
| `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` | Yes           | Browser-safe Supabase key                       |
| `SUPABASE_SECRET_KEY`                  | Yes           | Server-only database administration key         |
| `PAYMONGO_SECRET_KEY`                  | For payments  | Server-only PayMongo test or live secret key    |
| `PAYMONGO_WEBHOOK_SECRET`              | For payments  | Verifies the `Paymongo-Signature` header        |
| `PAYMONGO_LIVE_MODE`                   | Yes           | `false` for test keys; `true` for live keys     |
| `POLYGON_AMOY_RPC_URL`                 | For anchoring | Polygon Amoy JSON-RPC endpoint                  |
| `TRACKAID_LEDGER_ADDRESS`              | For anchoring | Deployed `TrackAidLedger` contract address      |
| `TRACKAID_RECORDER_PRIVATE_KEY`        | For anchoring | Server-only key authorized as contract recorder |
| `CRON_SECRET`                          | Production    | Authorizes the scheduled ledger worker          |

The Supabase Edge Function uses `SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY`, which Supabase provides to deployed functions.

## Supabase and authorization

Database changes live in `supabase/migrations/` and should be applied in order. The schema includes:

- verified organizations and organization membership;
- campaigns, donations, disbursements, confirmations, and audit entries;
- public program submissions and private evidence references;
- authenticated admin roles: `owner`, `reviewer`, and `auditor`;
- PayMongo webhook idempotency and donation reconciliation;
- independently approved organization payment destinations; and
- queued Polygon ledger jobs with retries.

Row Level Security is enabled on public operational tables. Sensitive server operations use the Supabase server secret and must never be moved into client components.

### Review controls

- Reviewers cannot approve their own program. A sole owner may approve their own submission, and the audit log marks the decision as an owner override.
- A payment destination must be submitted by one owner or reviewer and approved by another.
- Live donations are blocked when the verified organization has no active payout destination.
- Private evidence files stay in access-controlled Supabase Storage; only their fingerprints and redacted context are public.

## PayMongo setup

1. In the PayMongo Dashboard, switch to **Test Mode**.
2. Copy the test secret key into `PAYMONGO_SECRET_KEY`.
3. Create a webhook endpoint:

   ```text
   https://YOUR_DOMAIN/api/webhooks/paymongo
   ```

4. Subscribe it to `checkout_session.payment.paid`.
5. Store the returned signing secret as `PAYMONGO_WEBHOOK_SECRET`.
6. Keep `PAYMONGO_LIVE_MODE=false` while using test keys.

The webhook handler verifies signatures, stores an idempotency record, checks the campaign, donation, checkout session, amount, and environment, then queues the exact centavo amount for Polygon anchoring.

For direct recipient settlement, PayMongo must activate Split Payments and establish the merchant relationship. Add the organization's `org_...` merchant ID under **Admin → Payout routing** and have a different administrator approve it.

Official references:

- [Hosted Checkout](https://docs.paymongo.com/docs/payment-channels-hosted-checkout)
- [Payment testing](https://docs.paymongo.com/docs/payment-acceptance-testing)
- [Webhook setup](https://docs.paymongo.com/docs/creating-a-webhook-endpoint)
- [Split Payments](https://docs.paymongo.com/docs/seeds-payment-splitting)

### Test payment

A verified, published campaign is required before the donation form appears.

1. Open the campaign and enter at least PHP 100.
2. Continue to PayMongo Checkout.
3. Use a PayMongo test card:

   | Scenario           | Card number           | Result                       |
   | ------------------ | --------------------- | ---------------------------- |
   | Successful card    | `4343 4343 4343 4345` | Payment succeeds without 3DS |
   | 3D Secure          | `4120 0000 0000 0007` | Select **Authorize**         |
   | Insufficient funds | `5100 0000 0000 0198` | Payment is declined          |

4. Use any future expiry and any three-digit CVC.
5. After the redirect, verify the entry in the campaign audit trail, **Admin → Transactions**, and **Admin → Blockchain**.

Test keys do not move real money. Do not scan or pay a test QR Ph code; use PayMongo's test controls.

## Blockchain audit layer

`TrackAidLedger.sol` is an append-only EVM contract. It records:

- a deterministic record identifier;
- a campaign identifier hash;
- record kind;
- exact PHP amount in centavos;
- payload fingerprint;
- recorder address; and
- block timestamp.

It rejects duplicate record IDs and uses two-step owner and recorder transfers. It stores no names, bank details, receipts, card data, or funds.

Compile the contract with:

```bash
pnpm contract:compile
```

The artifact is written to `artifacts/TrackAidLedger.json` and is intentionally ignored by Git. Deploy it to Polygon Amoy with the intended owner and recorder addresses, fund the recorder with Amoy test POL, and configure the three ledger environment variables.

## Commands

| Command                 | Purpose                      |
| ----------------------- | ---------------------------- |
| `pnpm dev`              | Start the development server |
| `pnpm build`            | Create a production build    |
| `pnpm start`            | Run the production build     |
| `pnpm typecheck`        | Check TypeScript             |
| `pnpm lint`             | Run ESLint                   |
| `pnpm test`             | Run the Vitest suite         |
| `pnpm format:check`     | Check formatting             |
| `pnpm contract:compile` | Compile `TrackAidLedger.sol` |

The browser verification script expects a development server on port `3100`:

```bash
pnpm run dev -p 3100
python scripts/verify-webapp.py
```

## Deployment

The production project deploys from `main` to Vercel.

1. Add all required environment variables to Vercel Production.
2. Set `NEXT_PUBLIC_SITE_URL=https://trackaid.vercel.app` or the chosen stable domain.
3. Apply Supabase migrations before deploying application code that depends on them.
4. Deploy the same commit that passed tests and `pnpm build`.
5. Confirm that unsigned or invalid webhooks are rejected and that the scheduled ledger endpoint requires `CRON_SECRET`.

`vercel.json` runs the ledger worker daily. A successfully reconciled webhook also attempts to process one ledger job immediately.

## Security and privacy

- Never commit `.env*`, Supabase server keys, PayMongo keys, webhook secrets, RPC credentials, or private keys.
- Payment details are entered only on PayMongo's hosted page.
- Webhook signatures and event IDs are verified before donation state changes.
- Amounts are reconciled in integer centavos, not floating-point pesos.
- Evidence files remain private; public records expose only redacted details and cryptographic fingerprints.
- The blockchain is an integrity layer, not proof that an off-chain purchase or delivery was truthful. Independent evidence and confirmation remain necessary.
- Run Supabase security and performance advisors after schema changes.

Before accepting live donations, complete a security review, enable Supabase leaked-password protection, verify webhook delivery and retry behavior, audit the deployed contract, protect the recorder key with managed secrets, and complete PayMongo's activation and compliance requirements.

## Development workflow

- Keep changes focused and preserve existing user data.
- Add or update tests for payment, reconciliation, authorization, and ledger behavior.
- Run `pnpm typecheck`, `pnpm lint`, `pnpm test`, and `pnpm build` before release.
- Use Conventional Commits such as `feat:`, `fix:`, `docs:`, `test:`, `refactor:`, or `chore:`.
- Never commit generated builds, dependency directories, local environments, or credentials.
