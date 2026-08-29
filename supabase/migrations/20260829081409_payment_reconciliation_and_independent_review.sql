alter table public.program_submissions
  add constraint program_submissions_independent_review_check
  check (reviewed_by is null or reviewed_by <> submitted_by);

alter table public.organization_verification_submissions
  add constraint organization_verification_independent_review_check
  check (reviewed_by is null or reviewed_by <> submitted_by);

drop policy "submitters and reviewers update submissions"
on public.program_submissions;

create policy "submitters and reviewers update submissions"
on public.program_submissions for update to authenticated
using (
  (
    submitted_by = (select auth.uid())
    and status in ('draft', 'needs_information')
  )
  or private.is_app_admin(array['owner', 'reviewer']::public.app_admin_role[])
)
with check (
  (
    submitted_by = (select auth.uid())
    and status in ('draft', 'submitted')
  )
  or (
    private.is_app_admin(array['owner', 'reviewer']::public.app_admin_role[])
    and (reviewed_by is null or reviewed_by <> submitted_by)
  )
);

drop policy "owners and reviewers review organization verification"
on public.organization_verification_submissions;

create policy "owners and reviewers review organization verification"
on public.organization_verification_submissions for update to authenticated
using (private.is_app_admin(array['owner', 'reviewer']::public.app_admin_role[]))
with check (
  private.is_app_admin(array['owner', 'reviewer']::public.app_admin_role[])
  and (reviewed_by is null or reviewed_by <> submitted_by)
);

alter table public.donations
  alter column paymongo_payment_intent_id drop not null,
  add column paymongo_checkout_session_id text unique,
  add column fee_centavos bigint not null default 0 check (fee_centavos >= 0),
  add column net_amount_centavos bigint not null default 0 check (net_amount_centavos >= 0),
  add column payment_method_type text check (
    payment_method_type is null or char_length(payment_method_type) between 2 and 80
  ),
  add column livemode boolean,
  add constraint donations_reconciliation_check check (
    net_amount_centavos + fee_centavos <= amount_centavos
  ),
  add constraint donations_paid_reference_check check (
    status <> 'paid'
    or (
      paymongo_payment_id is not null
      and paymongo_payment_intent_id is not null
      and paid_at is not null
      and net_amount_centavos > 0
    )
  );

alter table public.campaigns
  add column processing_fee_centavos bigint not null default 0 check (processing_fee_centavos >= 0),
  add column net_received_centavos bigint not null default 0 check (net_received_centavos >= 0),
  drop constraint campaigns_amounts_check,
  add constraint campaigns_reconciliation_check check (
    processing_fee_centavos + net_received_centavos <= received_centavos
    and disbursed_centavos <= net_received_centavos
  );

create table public.organization_payment_destinations (
  organization_id uuid primary key references public.organizations (id) on delete cascade,
  paymongo_merchant_id text not null unique check (
    paymongo_merchant_id ~ '^org_[A-Za-z0-9]{10,}$'
  ),
  status text not null default 'pending' check (
    status in ('pending', 'active', 'suspended')
  ),
  submitted_by uuid not null references auth.users (id) on delete restrict,
  reviewed_by uuid references auth.users (id) on delete set null,
  reviewed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint organization_payment_destinations_review_check check (
    (
      status in ('active', 'suspended')
      and reviewed_by is not null
      and reviewed_at is not null
      and reviewed_by <> submitted_by
    )
    or status = 'pending'
  )
);

create index organization_payment_destinations_status_idx
on public.organization_payment_destinations (status, updated_at desc);

create trigger organization_payment_destinations_set_updated_at
before update on public.organization_payment_destinations
for each row execute function private.set_updated_at();

alter table public.organization_payment_destinations enable row level security;
revoke all on public.organization_payment_destinations from public, anon, authenticated;
grant select, insert, update on public.organization_payment_destinations to service_role;

create or replace function private.refresh_campaign_amounts()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  target_campaign_id uuid := coalesce(new.campaign_id, old.campaign_id);
begin
  update public.campaigns campaign
  set
    received_centavos = coalesce((
      select sum(donation.amount_centavos)
      from public.donations donation
      where donation.campaign_id = target_campaign_id and donation.status = 'paid'
    ), 0),
    processing_fee_centavos = coalesce((
      select sum(donation.fee_centavos)
      from public.donations donation
      where donation.campaign_id = target_campaign_id and donation.status = 'paid'
    ), 0),
    net_received_centavos = coalesce((
      select sum(donation.net_amount_centavos)
      from public.donations donation
      where donation.campaign_id = target_campaign_id and donation.status = 'paid'
    ), 0),
    disbursed_centavos = coalesce((
      select sum(disbursement.amount_centavos)
      from public.disbursements disbursement
      where disbursement.campaign_id = target_campaign_id and disbursement.status = 'confirmed'
    ), 0),
    updated_at = now()
  where campaign.id = target_campaign_id;
  return coalesce(new, old);
end;
$$;

update public.campaigns campaign
set
  received_centavos = coalesce((
    select sum(donation.amount_centavos)
    from public.donations donation
    where donation.campaign_id = campaign.id and donation.status = 'paid'
  ), 0),
  processing_fee_centavos = coalesce((
    select sum(donation.fee_centavos)
    from public.donations donation
    where donation.campaign_id = campaign.id and donation.status = 'paid'
  ), 0),
  net_received_centavos = coalesce((
    select sum(donation.net_amount_centavos)
    from public.donations donation
    where donation.campaign_id = campaign.id and donation.status = 'paid'
  ), 0);
