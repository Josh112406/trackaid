create index confirmations_campaign_id_idx
  on public.confirmations (campaign_id);

create index confirmations_submitted_by_idx
  on public.confirmations (submitted_by);

create index disbursements_created_by_idx
  on public.disbursements (created_by);

create index donations_donor_user_id_idx
  on public.donations (donor_user_id);

create index ledger_jobs_campaign_id_idx
  on public.ledger_jobs (campaign_id);

create index organization_members_user_id_idx
  on public.organization_members (user_id);

create index organizations_owner_user_id_idx
  on public.organizations (owner_user_id);
