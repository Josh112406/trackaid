alter policy "published campaigns are public" on public.campaigns to anon
using (status in ('published', 'closed'));

create policy "authenticated users view accessible campaigns"
on public.campaigns for select to authenticated
using (
  status in ('published', 'closed')
  or private.is_organization_member(organization_id)
  or private.is_app_admin()
);

alter policy "published campaign audit is public" on public.audit_entries to anon
using (
  exists (
    select 1 from public.campaigns campaign
    where campaign.id = audit_entries.campaign_id
      and campaign.status in ('published', 'closed')
  )
);

create policy "authenticated users view accessible audit entries"
on public.audit_entries for select to authenticated
using (
  private.is_app_admin()
  or exists (
    select 1 from public.campaigns campaign
    where campaign.id = audit_entries.campaign_id
      and campaign.status in ('published', 'closed')
  )
);

alter policy "visible official sources are public"
on public.external_campaign_sources to anon
using (is_visible);

create policy "authenticated users view official sources"
on public.external_campaign_sources for select to authenticated
using (is_visible or private.is_app_admin());
