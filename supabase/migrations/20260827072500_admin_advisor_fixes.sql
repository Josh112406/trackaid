create index app_admins_invited_by_idx on public.app_admins (invited_by);

drop policy "submitters update their unreviewed submissions" on public.program_submissions;
drop policy "owners and reviewers review submissions" on public.program_submissions;

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
  or private.is_app_admin(array['owner', 'reviewer']::public.app_admin_role[])
);

drop policy "owners and reviewers manage official sources" on public.external_campaign_sources;

create policy "owners and reviewers create official sources"
on public.external_campaign_sources for insert to authenticated
with check (private.is_app_admin(array['owner', 'reviewer']::public.app_admin_role[]));

create policy "owners and reviewers update official sources"
on public.external_campaign_sources for update to authenticated
using (private.is_app_admin(array['owner', 'reviewer']::public.app_admin_role[]))
with check (private.is_app_admin(array['owner', 'reviewer']::public.app_admin_role[]));

create policy "owners and reviewers delete official sources"
on public.external_campaign_sources for delete to authenticated
using (private.is_app_admin(array['owner', 'reviewer']::public.app_admin_role[]));
