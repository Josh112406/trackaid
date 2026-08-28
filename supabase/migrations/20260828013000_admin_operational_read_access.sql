create policy "administrators view every campaign"
on public.campaigns for select to authenticated
using (private.is_app_admin());

create policy "administrators view every donation"
on public.donations for select to authenticated
using (private.is_app_admin());

create policy "administrators view every disbursement"
on public.disbursements for select to authenticated
using (private.is_app_admin());

create policy "administrators view every confirmation"
on public.confirmations for select to authenticated
using (private.is_app_admin());

create policy "administrators view webhook processing"
on public.webhook_events for select to authenticated
using (private.is_app_admin());

create policy "administrators view ledger processing"
on public.ledger_jobs for select to authenticated
using (private.is_app_admin());

create policy "administrators view every public audit entry"
on public.audit_entries for select to authenticated
using (private.is_app_admin());

create policy "administrators view analytics"
on public.analytics_events for select to authenticated
using (private.is_app_admin());

grant select on public.campaigns, public.donations, public.disbursements,
  public.confirmations, public.webhook_events, public.ledger_jobs,
  public.audit_entries, public.analytics_events to authenticated;
