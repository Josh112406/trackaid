create extension if not exists pg_cron with schema pg_catalog;
create extension if not exists pg_net with schema extensions;
create extension if not exists supabase_vault with schema vault;

do $$
begin
  if not exists (select 1 from vault.secrets where name = 'trackaid_source_monitor') then
    perform vault.create_secret(
      encode(extensions.gen_random_bytes(32), 'hex'),
      'trackaid_source_monitor',
      'Authenticates the six-hour TrackAid official-source monitor'
    );
  end if;
end;
$$;

create or replace function public.verify_source_monitor_secret(candidate text)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from vault.decrypted_secrets secret
    where secret.name = 'trackaid_source_monitor'
      and length(candidate) >= 32
      and secret.decrypted_secret = candidate
  );
$$;

revoke all on function public.verify_source_monitor_secret(text) from public;
grant execute on function public.verify_source_monitor_secret(text) to anon;

select cron.unschedule(jobid)
from cron.job
where jobname = 'trackaid-source-monitor';

select cron.schedule(
  'trackaid-source-monitor',
  '0 */6 * * *',
  $schedule$
    select net.http_post(
      url := 'https://xjkauffjltonvxgiqgqx.supabase.co/functions/v1/source-monitor',
      headers := jsonb_build_object(
        'Content-Type', 'application/json',
        'x-trackaid-monitor-secret', (
          select decrypted_secret
          from vault.decrypted_secrets
          where name = 'trackaid_source_monitor'
        )
      ),
      body := '{}'::jsonb,
      timeout_milliseconds := 50000
    );
  $schedule$
);
