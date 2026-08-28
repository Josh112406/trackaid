create type public.app_admin_role as enum ('owner', 'reviewer', 'auditor');
create type public.submission_status as enum (
  'draft',
  'submitted',
  'needs_information',
  'approved',
  'rejected',
  'suspended',
  'expired'
);
create type public.proof_kind as enum (
  'public_website',
  'social_post',
  'pubmat',
  'video',
  'news_coverage',
  'registration',
  'representative_authorization',
  'payout_account',
  'budget',
  'beneficiary_plan',
  'other'
);
create type public.source_health as enum ('healthy', 'warning', 'unavailable');
create type public.analytics_event_kind as enum (
  'page_view',
  'campaign_view',
  'external_redirect',
  'submission_created',
  'submission_approved',
  'payment_intent_created',
  'payment_paid',
  'payment_failed',
  'payment_refunded',
  'disbursement_confirmed',
  'ledger_confirmed'
);

create table public.app_admins (
  user_id uuid primary key references auth.users (id) on delete cascade,
  role public.app_admin_role not null default 'auditor',
  invited_by uuid references auth.users (id) on delete set null,
  created_at timestamptz not null default now()
);

create table public.program_submissions (
  id uuid primary key default gen_random_uuid(),
  submitted_by uuid not null references auth.users (id) on delete restrict,
  organization_name text not null check (char_length(organization_name) between 2 and 160),
  program_name text not null check (char_length(program_name) between 4 and 180),
  location text not null check (char_length(location) between 2 and 240),
  public_source_url text not null check (public_source_url ~ '^https://'),
  official_domain text check (official_domain is null or official_domain ~ '^[a-z0-9.-]+$'),
  summary text not null check (char_length(summary) between 20 and 2000),
  status public.submission_status not null default 'draft',
  review_reason text not null default '' check (char_length(review_reason) <= 2000),
  reviewed_by uuid references auth.users (id) on delete set null,
  submitted_at timestamptz,
  reviewed_at timestamptz,
  proof_expires_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint program_submissions_submitted_at_check check (
    (status = 'draft' and submitted_at is null) or status <> 'draft'
  ),
  constraint program_submissions_review_check check (
    (status in ('approved', 'rejected', 'suspended') and reviewed_by is not null and reviewed_at is not null)
    or status not in ('approved', 'rejected', 'suspended')
  )
);

create table public.program_proofs (
  id uuid primary key default gen_random_uuid(),
  submission_id uuid not null references public.program_submissions (id) on delete cascade,
  kind public.proof_kind not null,
  label text not null check (char_length(label) between 2 and 180),
  public_url text check (public_url is null or public_url ~ '^https://'),
  private_object_path text,
  sha256 text not null check (sha256 ~ '^[0-9a-f]{64}$'),
  is_identity_proof boolean not null default false,
  created_at timestamptz not null default now(),
  constraint program_proofs_location_check check (
    public_url is not null or private_object_path is not null
  )
);

create table public.external_campaign_sources (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique check (slug ~ '^[a-z0-9]+(?:-[a-z0-9]+)*$'),
  organization_name text not null check (char_length(organization_name) between 2 and 160),
  title text not null check (char_length(title) between 4 and 180),
  location text not null default 'Philippines',
  summary text not null check (char_length(summary) between 20 and 1000),
  official_source_url text not null unique check (official_source_url ~ '^https://'),
  donation_url text not null check (donation_url ~ '^https://'),
  source_domain text not null check (source_domain ~ '^[a-z0-9.-]+$'),
  source_health public.source_health not null default 'healthy',
  last_checked_at timestamptz not null default now(),
  last_success_at timestamptz not null default now(),
  consecutive_failures integer not null default 0 check (consecutive_failures >= 0),
  is_visible boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.source_check_logs (
  id bigint generated always as identity primary key,
  source_id uuid not null references public.external_campaign_sources (id) on delete cascade,
  status_code integer,
  donation_cta_found boolean not null,
  checked_url text not null,
  detail text not null default '' check (char_length(detail) <= 1000),
  checked_at timestamptz not null default now()
);

create table public.analytics_events (
  id bigint generated always as identity primary key,
  event_kind public.analytics_event_kind not null,
  campaign_id uuid references public.campaigns (id) on delete set null,
  external_source_id uuid references public.external_campaign_sources (id) on delete set null,
  session_token_hash text check (session_token_hash is null or session_token_hash ~ '^[0-9a-f]{64}$'),
  path text not null default '/' check (char_length(path) <= 500),
  amount_centavos bigint check (amount_centavos is null or amount_centavos >= 0),
  metadata jsonb not null default '{}'::jsonb,
  occurred_at timestamptz not null default now()
);

create table public.admin_audit_log (
  id bigint generated always as identity primary key,
  actor_user_id uuid references auth.users (id) on delete set null,
  action text not null check (char_length(action) between 3 and 120),
  entity_type text not null check (char_length(entity_type) between 2 and 80),
  entity_id text not null check (char_length(entity_id) between 1 and 180),
  detail jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index program_submissions_status_created_idx on public.program_submissions (status, created_at desc);
create index program_submissions_submitted_by_idx on public.program_submissions (submitted_by, created_at desc);
create index program_submissions_reviewed_by_idx on public.program_submissions (reviewed_by, reviewed_at desc);
create index program_proofs_submission_id_idx on public.program_proofs (submission_id, created_at desc);
create index external_campaign_sources_visible_checked_idx on public.external_campaign_sources (is_visible, last_checked_at desc);
create index source_check_logs_source_checked_idx on public.source_check_logs (source_id, checked_at desc);
create index analytics_events_kind_occurred_idx on public.analytics_events (event_kind, occurred_at desc);
create index analytics_events_campaign_id_idx on public.analytics_events (campaign_id, occurred_at desc);
create index analytics_events_external_source_id_idx on public.analytics_events (external_source_id, occurred_at desc);
create index admin_audit_log_created_idx on public.admin_audit_log (created_at desc);
create index admin_audit_log_actor_idx on public.admin_audit_log (actor_user_id, created_at desc);

create or replace function private.is_app_admin(required_roles public.app_admin_role[] default null)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.app_admins admin
    where admin.user_id = (select auth.uid())
      and (required_roles is null or admin.role = any(required_roles))
  );
$$;

create trigger program_submissions_set_updated_at before update on public.program_submissions
for each row execute function private.set_updated_at();
create trigger external_campaign_sources_set_updated_at before update on public.external_campaign_sources
for each row execute function private.set_updated_at();

alter table public.app_admins enable row level security;
alter table public.program_submissions enable row level security;
alter table public.program_proofs enable row level security;
alter table public.external_campaign_sources enable row level security;
alter table public.source_check_logs enable row level security;
alter table public.analytics_events enable row level security;
alter table public.admin_audit_log enable row level security;

create policy "administrators view administrator roles"
on public.app_admins for select to authenticated
using (user_id = (select auth.uid()) or private.is_app_admin());

create policy "submitters and administrators view submissions"
on public.program_submissions for select to authenticated
using (submitted_by = (select auth.uid()) or private.is_app_admin());
create policy "signed-in users create draft submissions"
on public.program_submissions for insert to authenticated
with check (submitted_by = (select auth.uid()) and status = 'draft');
create policy "submitters update their unreviewed submissions"
on public.program_submissions for update to authenticated
using (submitted_by = (select auth.uid()) and status in ('draft', 'needs_information'))
with check (submitted_by = (select auth.uid()) and status in ('draft', 'submitted'));
create policy "owners and reviewers review submissions"
on public.program_submissions for update to authenticated
using (private.is_app_admin(array['owner', 'reviewer']::public.app_admin_role[]))
with check (private.is_app_admin(array['owner', 'reviewer']::public.app_admin_role[]));

create policy "submission participants view proofs"
on public.program_proofs for select to authenticated
using (
  exists (
    select 1 from public.program_submissions submission
    where submission.id = program_proofs.submission_id
      and (submission.submitted_by = (select auth.uid()) or private.is_app_admin())
  )
);
create policy "submitters add proofs before approval"
on public.program_proofs for insert to authenticated
with check (
  exists (
    select 1 from public.program_submissions submission
    where submission.id = program_proofs.submission_id
      and submission.submitted_by = (select auth.uid())
      and submission.status in ('draft', 'needs_information')
  )
);

create policy "visible official sources are public"
on public.external_campaign_sources for select
using (is_visible or private.is_app_admin());
create policy "owners and reviewers manage official sources"
on public.external_campaign_sources for all to authenticated
using (private.is_app_admin(array['owner', 'reviewer']::public.app_admin_role[]))
with check (private.is_app_admin(array['owner', 'reviewer']::public.app_admin_role[]));

create policy "administrators view source checks"
on public.source_check_logs for select to authenticated
using (private.is_app_admin());
create policy "administrators view audit logs"
on public.admin_audit_log for select to authenticated
using (private.is_app_admin());

grant execute on function private.is_app_admin(public.app_admin_role[]) to authenticated;
grant select on public.external_campaign_sources to anon, authenticated;
grant select on public.app_admins, public.program_submissions, public.program_proofs, public.source_check_logs, public.admin_audit_log to authenticated;
grant insert, update on public.program_submissions to authenticated;
grant insert on public.program_proofs to authenticated;
grant insert, update, delete on public.external_campaign_sources to authenticated;

insert into public.external_campaign_sources (
  slug,
  organization_name,
  title,
  summary,
  official_source_url,
  donation_url,
  source_domain
)
values
  (
    'philippine-red-cross',
    'Philippine Red Cross',
    'Philippine Red Cross donation options',
    'Official donation options published by the Philippine Red Cross for humanitarian response work.',
    'https://redcross.org.ph/ways-to-donate/',
    'https://redcross.org.ph/ways-to-donate/',
    'redcross.org.ph'
  ),
  (
    'unicef-philippines-urgent-help',
    'UNICEF Philippines',
    'Urgent help for children and families',
    'An official UNICEF Philippines appeal supporting urgent assistance for children and families.',
    'https://donate.unicef.ph/campaign/urgent-help',
    'https://donate.unicef.ph/campaign/urgent-help',
    'donate.unicef.ph'
  ),
  (
    'world-vision-philippines-typhoon-relief',
    'World Vision Philippines',
    'Typhoon relief in the Philippines',
    'Official World Vision Philippines guidance and donation access for typhoon relief response.',
    'https://www.worldvision.org.ph/how-to-donate-for-typhoon-relief-philippines/',
    'https://www.worldvision.org.ph/donate/',
    'worldvision.org.ph'
  ),
  (
    'oxfam-philippines',
    'Oxfam',
    'Oxfam response work in the Philippines',
    'Official information about Oxfam work in the Philippines with an external Oxfam donation destination.',
    'https://www.oxfamamerica.org/explore/countries/philippines/',
    'https://give.oxfamamerica.org/page/26476/donate/1',
    'oxfamamerica.org'
  )
on conflict (official_source_url) do update set
  title = excluded.title,
  summary = excluded.summary,
  donation_url = excluded.donation_url,
  source_domain = excluded.source_domain,
  updated_at = now();
