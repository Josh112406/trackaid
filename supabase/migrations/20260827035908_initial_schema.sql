create extension if not exists pgcrypto with schema extensions;

create schema if not exists private;
revoke all on schema private from public, anon, authenticated;

create type public.organization_status as enum ('pending', 'verified', 'suspended');
create type public.campaign_status as enum ('draft', 'published', 'closed');
create type public.donation_status as enum ('pending', 'paid', 'failed', 'refunded');
create type public.disbursement_status as enum ('submitted', 'confirmed', 'rejected');
create type public.confirmation_kind as enum ('beneficiary', 'supplier');
create type public.confirmation_status as enum ('submitted', 'confirmed', 'disputed');
create type public.webhook_status as enum ('received', 'processed', 'ignored', 'failed');
create type public.ledger_job_status as enum ('pending', 'processing', 'confirmed', 'failed');
create type public.audit_event_type as enum (
  'donation',
  'disbursement',
  'beneficiary_confirmation',
  'supplier_confirmation'
);
create type public.audit_event_status as enum ('confirmed', 'submitted', 'pending');

create table public.organizations (
  id uuid primary key default gen_random_uuid(),
  owner_user_id uuid not null references auth.users (id) on delete restrict,
  name text not null check (char_length(name) between 2 and 160),
  slug text not null unique check (slug ~ '^[a-z0-9]+(?:-[a-z0-9]+)*$'),
  description text not null default '' check (char_length(description) <= 2000),
  status public.organization_status not null default 'pending',
  verified_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint organizations_verified_at_check check (
    (status = 'verified' and verified_at is not null) or status <> 'verified'
  )
);

create table public.organization_members (
  organization_id uuid not null references public.organizations (id) on delete cascade,
  user_id uuid not null references auth.users (id) on delete cascade,
  role text not null check (role in ('owner', 'manager', 'auditor')),
  created_at timestamptz not null default now(),
  primary key (organization_id, user_id)
);

create table public.campaigns (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations (id) on delete restrict,
  slug text not null unique check (slug ~ '^[a-z0-9]+(?:-[a-z0-9]+)*$'),
  title text not null check (char_length(title) between 4 and 180),
  disaster_name text not null check (char_length(disaster_name) between 2 and 180),
  location text not null check (char_length(location) between 2 and 240),
  summary text not null check (char_length(summary) between 20 and 2000),
  target_beneficiaries text not null check (char_length(target_beneficiaries) between 2 and 500),
  funding_goal_centavos bigint not null check (funding_goal_centavos > 0),
  received_centavos bigint not null default 0 check (received_centavos >= 0),
  disbursed_centavos bigint not null default 0 check (disbursed_centavos >= 0),
  status public.campaign_status not null default 'draft',
  is_demonstration boolean not null default false,
  published_at timestamptz,
  closes_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint campaigns_published_at_check check (
    (status = 'published' and published_at is not null) or status <> 'published'
  ),
  constraint campaigns_amounts_check check (disbursed_centavos <= received_centavos)
);

create table public.donations (
  id uuid primary key,
  campaign_id uuid not null references public.campaigns (id) on delete restrict,
  donor_user_id uuid references auth.users (id) on delete set null,
  paymongo_payment_id text unique,
  paymongo_payment_intent_id text not null unique,
  paymongo_event_id text unique,
  amount_centavos bigint not null check (amount_centavos > 0),
  currency text not null default 'PHP' check (currency = 'PHP'),
  status public.donation_status not null default 'pending',
  paid_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint donations_paid_at_check check ((status = 'paid' and paid_at is not null) or status <> 'paid')
);

create table public.disbursements (
  id uuid primary key default gen_random_uuid(),
  campaign_id uuid not null references public.campaigns (id) on delete restrict,
  created_by uuid not null references auth.users (id) on delete restrict,
  purpose text not null check (char_length(purpose) between 8 and 500),
  supplier_name text check (supplier_name is null or char_length(supplier_name) <= 200),
  amount_centavos bigint not null check (amount_centavos > 0),
  evidence_object_path text not null,
  evidence_sha256 text not null check (evidence_sha256 ~ '^[0-9a-f]{64}$'),
  status public.disbursement_status not null default 'submitted',
  occurred_at timestamptz not null,
  confirmed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint disbursements_confirmed_at_check check (
    (status = 'confirmed' and confirmed_at is not null) or status <> 'confirmed'
  )
);

create table public.confirmations (
  id uuid primary key default gen_random_uuid(),
  campaign_id uuid not null references public.campaigns (id) on delete restrict,
  disbursement_id uuid not null references public.disbursements (id) on delete cascade,
  kind public.confirmation_kind not null,
  status public.confirmation_status not null default 'submitted',
  public_note text not null default '' check (char_length(public_note) <= 500),
  evidence_object_path text,
  evidence_sha256 text check (evidence_sha256 is null or evidence_sha256 ~ '^[0-9a-f]{64}$'),
  submitted_by uuid references auth.users (id) on delete set null,
  submitted_at timestamptz not null default now(),
  confirmed_at timestamptz,
  constraint confirmations_confirmed_at_check check (
    (status = 'confirmed' and confirmed_at is not null) or status <> 'confirmed'
  )
);

create table public.webhook_events (
  id text primary key,
  event_type text not null,
  payload_sha256 text not null check (payload_sha256 ~ '^[0-9a-f]{64}$'),
  status public.webhook_status not null default 'received',
  processing_error text,
  received_at timestamptz not null default now(),
  processed_at timestamptz
);

create table public.ledger_jobs (
  id uuid primary key default gen_random_uuid(),
  entity_type text not null check (entity_type in ('donation', 'disbursement', 'confirmation')),
  entity_id uuid not null,
  campaign_id uuid not null references public.campaigns (id) on delete restrict,
  amount_centavos bigint not null default 0 check (amount_centavos >= 0),
  payload_hash text not null check (payload_hash ~ '^0x[0-9a-f]{64}$'),
  status public.ledger_job_status not null default 'pending',
  attempts integer not null default 0 check (attempts >= 0),
  tx_hash text unique check (tx_hash is null or tx_hash ~ '^0x[0-9a-fA-F]{64}$'),
  last_error text,
  next_attempt_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (entity_type, entity_id)
);

create table public.audit_entries (
  id uuid primary key default gen_random_uuid(),
  campaign_id uuid not null references public.campaigns (id) on delete restrict,
  entity_type public.audit_event_type not null,
  entity_id uuid not null,
  title text not null check (char_length(title) between 4 and 180),
  public_detail text not null check (char_length(public_detail) between 4 and 1000),
  amount_centavos bigint check (amount_centavos is null or amount_centavos >= 0),
  status public.audit_event_status not null default 'pending',
  ledger_tx_hash text check (ledger_tx_hash is null or ledger_tx_hash ~ '^0x[0-9a-fA-F]{64}$'),
  evidence_sha256 text check (evidence_sha256 is null or evidence_sha256 ~ '^[0-9a-f]{64}$'),
  occurred_at timestamptz not null,
  created_at timestamptz not null default now(),
  unique (entity_type, entity_id)
);

create index campaigns_organization_id_idx on public.campaigns (organization_id);
create index campaigns_status_published_at_idx on public.campaigns (status, published_at desc);
create index donations_campaign_paid_idx on public.donations (campaign_id, paid_at desc) where status = 'paid';
create index disbursements_campaign_occurred_idx on public.disbursements (campaign_id, occurred_at desc);
create index confirmations_disbursement_idx on public.confirmations (disbursement_id, submitted_at desc);
create index ledger_jobs_ready_idx on public.ledger_jobs (status, next_attempt_at) where status in ('pending', 'failed');
create index audit_entries_campaign_occurred_idx on public.audit_entries (campaign_id, occurred_at desc);

create or replace function private.is_organization_member(target_organization_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.organization_members member
    where member.organization_id = target_organization_id
      and member.user_id = (select auth.uid())
  );
$$;

create or replace function private.is_organization_member_text(target_organization_id text)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.organization_members member
    where member.organization_id::text = target_organization_id
      and member.user_id = (select auth.uid())
  );
$$;

create or replace function private.can_manage_campaign(target_campaign_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.campaigns campaign
    join public.organization_members member on member.organization_id = campaign.organization_id
    where campaign.id = target_campaign_id
      and member.user_id = (select auth.uid())
      and member.role in ('owner', 'manager')
  );
$$;

create or replace function private.set_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create or replace function private.add_organization_owner_member()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.organization_members (organization_id, user_id, role)
  values (new.id, new.owner_user_id, 'owner');
  return new;
end;
$$;

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

create or replace function private.prevent_audit_mutation()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if coalesce(auth.role(), '') <> 'service_role' and current_user not in ('postgres', 'supabase_admin') then
    raise exception 'Audit entries may only be finalized by the trusted backend';
  end if;
  return new;
end;
$$;

create trigger organizations_set_updated_at before update on public.organizations
for each row execute function private.set_updated_at();
create trigger organizations_add_owner_member after insert on public.organizations
for each row execute function private.add_organization_owner_member();
create trigger campaigns_set_updated_at before update on public.campaigns
for each row execute function private.set_updated_at();
create trigger donations_set_updated_at before update on public.donations
for each row execute function private.set_updated_at();
create trigger disbursements_set_updated_at before update on public.disbursements
for each row execute function private.set_updated_at();
create trigger ledger_jobs_set_updated_at before update on public.ledger_jobs
for each row execute function private.set_updated_at();

create trigger donations_refresh_campaign_amounts
after insert or update of amount_centavos, status or delete on public.donations
for each row execute function private.refresh_campaign_amounts();
create trigger disbursements_refresh_campaign_amounts
after insert or update of amount_centavos, status or delete on public.disbursements
for each row execute function private.refresh_campaign_amounts();
create trigger audit_entries_append_only
before update or delete on public.audit_entries
for each row execute function private.prevent_audit_mutation();

alter table public.organizations enable row level security;
alter table public.organization_members enable row level security;
alter table public.campaigns enable row level security;
alter table public.donations enable row level security;
alter table public.disbursements enable row level security;
alter table public.confirmations enable row level security;
alter table public.webhook_events enable row level security;
alter table public.ledger_jobs enable row level security;
alter table public.audit_entries enable row level security;

create policy "verified organizations are public"
on public.organizations for select
using (status = 'verified' or owner_user_id = (select auth.uid()) or private.is_organization_member(id));
create policy "users create their organization"
on public.organizations for insert to authenticated
with check (owner_user_id = (select auth.uid()) and status = 'pending');
create policy "owners update their organization"
on public.organizations for update to authenticated
using (owner_user_id = (select auth.uid()))
with check (owner_user_id = (select auth.uid()));

create policy "members can view membership"
on public.organization_members for select to authenticated
using (user_id = (select auth.uid()) or private.is_organization_member(organization_id));

create policy "published campaigns are public"
on public.campaigns for select
using (status in ('published', 'closed') or private.is_organization_member(organization_id));
create policy "organization managers create campaigns"
on public.campaigns for insert to authenticated
with check (private.is_organization_member(organization_id));
create policy "organization managers update campaigns"
on public.campaigns for update to authenticated
using (private.is_organization_member(organization_id))
with check (private.is_organization_member(organization_id));

create policy "donors and organization members view donations"
on public.donations for select to authenticated
using (donor_user_id = (select auth.uid()) or private.can_manage_campaign(campaign_id));

create policy "organization managers view disbursements"
on public.disbursements for select to authenticated
using (private.can_manage_campaign(campaign_id));
create policy "organization managers create disbursements"
on public.disbursements for insert to authenticated
with check (created_by = (select auth.uid()) and private.can_manage_campaign(campaign_id));
create policy "organization managers update disbursements"
on public.disbursements for update to authenticated
using (private.can_manage_campaign(campaign_id))
with check (private.can_manage_campaign(campaign_id));

create policy "organization managers view confirmations"
on public.confirmations for select to authenticated
using (private.can_manage_campaign(campaign_id) or submitted_by = (select auth.uid()));
create policy "signed-in users submit confirmations"
on public.confirmations for insert to authenticated
with check (submitted_by = (select auth.uid()) and status = 'submitted');
create policy "organization managers review confirmations"
on public.confirmations for update to authenticated
using (private.can_manage_campaign(campaign_id))
with check (private.can_manage_campaign(campaign_id));

create policy "published campaign audit is public"
on public.audit_entries for select
using (
  exists (
    select 1 from public.campaigns campaign
    where campaign.id = audit_entries.campaign_id
      and campaign.status in ('published', 'closed')
  )
);

revoke all on all tables in schema public from anon, authenticated;
grant usage on schema public to anon, authenticated;
grant usage on schema private to anon, authenticated;
grant execute on function private.is_organization_member(uuid) to anon, authenticated;
grant execute on function private.is_organization_member_text(text) to authenticated;
grant execute on function private.can_manage_campaign(uuid) to authenticated;
grant select on public.organizations, public.campaigns, public.audit_entries to anon, authenticated;
grant insert, update on public.organizations, public.campaigns to authenticated;
grant select on public.organization_members, public.donations, public.disbursements, public.confirmations to authenticated;
grant insert, update on public.disbursements, public.confirmations to authenticated;

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'organization-evidence',
  'organization-evidence',
  false,
  10485760,
  array['application/pdf', 'image/jpeg', 'image/png', 'image/webp']
)
on conflict (id) do update set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

create policy "organization members read private evidence"
on storage.objects for select to authenticated
using (
  bucket_id = 'organization-evidence'
  and private.is_organization_member_text((storage.foldername(name))[1])
);
create policy "organization members upload private evidence"
on storage.objects for insert to authenticated
with check (
  bucket_id = 'organization-evidence'
  and private.is_organization_member_text((storage.foldername(name))[1])
);
create policy "organization members update private evidence"
on storage.objects for update to authenticated
using (
  bucket_id = 'organization-evidence'
  and private.is_organization_member_text((storage.foldername(name))[1])
)
with check (
  bucket_id = 'organization-evidence'
  and private.is_organization_member_text((storage.foldername(name))[1])
);
create policy "organization members delete private evidence"
on storage.objects for delete to authenticated
using (
  bucket_id = 'organization-evidence'
  and private.is_organization_member_text((storage.foldername(name))[1])
);
