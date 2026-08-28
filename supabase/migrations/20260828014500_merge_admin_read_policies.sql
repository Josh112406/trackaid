drop policy "administrators view every campaign" on public.campaigns;
alter policy "published campaigns are public" on public.campaigns
using (status in ('published', 'closed') or private.is_organization_member(organization_id) or private.is_app_admin());

drop policy "administrators view every donation" on public.donations;
alter policy "donors and organization members view donations" on public.donations
using (donor_user_id = (select auth.uid()) or private.can_manage_campaign(campaign_id) or private.is_app_admin());

drop policy "administrators view every disbursement" on public.disbursements;
alter policy "organization managers view disbursements" on public.disbursements
using (private.can_manage_campaign(campaign_id) or private.is_app_admin());

drop policy "administrators view every confirmation" on public.confirmations;
alter policy "organization managers view confirmations" on public.confirmations
using (private.can_manage_campaign(campaign_id) or submitted_by = (select auth.uid()) or private.is_app_admin());

drop policy "administrators view every public audit entry" on public.audit_entries;
alter policy "published campaign audit is public" on public.audit_entries
using (
  private.is_app_admin()
  or exists (
    select 1 from public.campaigns campaign
    where campaign.id = audit_entries.campaign_id
      and campaign.status in ('published', 'closed')
  )
);
