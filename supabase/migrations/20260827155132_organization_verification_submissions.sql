create table public.organization_verification_submissions (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null unique references public.organizations (id) on delete cascade,
  submitted_by uuid not null references auth.users (id) on delete restrict,
  official_email text not null check (
    char_length(official_email) between 5 and 254
    and position('@' in official_email) > 1
  ),
  settlement_account_holder text not null check (char_length(settlement_account_holder) between 2 and 180),
  permit_object_path text not null check (
    permit_object_path ~ '^[0-9a-f-]{36}/verification/[0-9a-f-]{36}\.(pdf|jpg|jpeg|png|webp)$'
  ),
  permit_original_name text not null check (char_length(permit_original_name) between 1 and 255),
  permit_mime_type text not null check (
    permit_mime_type in ('application/pdf', 'image/jpeg', 'image/png', 'image/webp')
  ),
  permit_size_bytes bigint not null check (permit_size_bytes between 1 and 10485760),
  permit_sha256 text not null check (permit_sha256 ~ '^[0-9a-f]{64}$'),
  status public.submission_status not null default 'submitted' check (
    status in ('submitted', 'needs_information', 'approved', 'rejected', 'suspended')
  ),
  review_reason text not null default '' check (char_length(review_reason) <= 2000),
  reviewed_by uuid references auth.users (id) on delete set null,
  submitted_at timestamptz not null default now(),
  reviewed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint organization_verification_review_check check (
    (
      status in ('approved', 'rejected', 'suspended')
      and reviewed_by is not null
      and reviewed_at is not null
    )
    or status not in ('approved', 'rejected', 'suspended')
  )
);

create index organization_verification_status_submitted_idx
on public.organization_verification_submissions (status, submitted_at desc);

create index organization_verification_submitted_by_idx
on public.organization_verification_submissions (submitted_by, submitted_at desc);

create trigger organization_verification_set_updated_at
before update on public.organization_verification_submissions
for each row execute function private.set_updated_at();

alter table public.organization_verification_submissions enable row level security;

create policy "participants view organization verification submissions"
on public.organization_verification_submissions for select to authenticated
using (
  submitted_by = (select auth.uid())
  or private.is_app_admin()
);

create policy "administrators submit organization verification"
on public.organization_verification_submissions for insert to authenticated
with check (
  submitted_by = (select auth.uid())
  and private.is_app_admin(array['owner', 'reviewer']::public.app_admin_role[])
  and exists (
    select 1
    from public.organizations organization
    where organization.id = organization_id
      and organization.owner_user_id = (select auth.uid())
      and organization.status = 'pending'
  )
);

create policy "owners and reviewers review organization verification"
on public.organization_verification_submissions for update to authenticated
using (private.is_app_admin(array['owner', 'reviewer']::public.app_admin_role[]))
with check (private.is_app_admin(array['owner', 'reviewer']::public.app_admin_role[]));

create policy "owners remove incomplete pending organizations"
on public.organizations for delete to authenticated
using (
  owner_user_id = (select auth.uid())
  and status = 'pending'
  and not exists (
    select 1
    from public.organization_verification_submissions submission
    where submission.organization_id = organizations.id
  )
);

grant select, insert, update on public.organization_verification_submissions to authenticated;
grant delete on public.organizations to authenticated;
