alter table public.ledger_jobs
  drop constraint if exists ledger_jobs_tx_hash_check,
  add constraint ledger_jobs_tx_hash_check check (
    tx_hash is null
    or tx_hash ~ '^[1-9A-HJ-NP-Za-km-z]{64,88}$'
  );

alter table public.audit_entries
  drop constraint if exists audit_entries_ledger_tx_hash_check,
  add constraint audit_entries_ledger_tx_hash_check check (
    ledger_tx_hash is null
    or ledger_tx_hash ~ '^[1-9A-HJ-NP-Za-km-z]{64,88}$'
  );
