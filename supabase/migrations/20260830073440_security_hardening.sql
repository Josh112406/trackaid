create table private.security_rate_limits (
  key_hash text primary key check (key_hash ~ '^[0-9a-f]{64}$'),
  attempts integer not null default 0 check (attempts >= 0),
  window_started_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table private.security_rate_limits enable row level security;
revoke all on table private.security_rate_limits from public, anon, authenticated;
grant select, insert, update, delete on table private.security_rate_limits to service_role;

create or replace function public.consume_security_rate_limit(
  p_key_hash text,
  p_limit integer,
  p_window_seconds integer
)
returns boolean
language plpgsql
security definer
set search_path = ''
as $$
declare
  counter private.security_rate_limits%rowtype;
  current_time timestamptz := clock_timestamp();
begin
  if p_key_hash !~ '^[0-9a-f]{64}$'
    or p_limit < 1
    or p_limit > 1000
    or p_window_seconds < 10
    or p_window_seconds > 86400
  then
    raise exception 'Invalid rate-limit parameters.' using errcode = '22023';
  end if;

  insert into private.security_rate_limits (key_hash, attempts, window_started_at, updated_at)
  values (p_key_hash, 0, current_time, current_time)
  on conflict (key_hash) do nothing;

  select *
  into counter
  from private.security_rate_limits
  where key_hash = p_key_hash
  for update;

  if counter.window_started_at + make_interval(secs => p_window_seconds) <= current_time then
    update private.security_rate_limits
    set attempts = 1, window_started_at = current_time, updated_at = current_time
    where key_hash = p_key_hash;
    return true;
  end if;

  if counter.attempts >= p_limit then
    return false;
  end if;

  update private.security_rate_limits
  set attempts = attempts + 1, updated_at = current_time
  where key_hash = p_key_hash;
  return true;
end;
$$;

revoke all on function public.consume_security_rate_limit(text, integer, integer)
from public, anon, authenticated;
grant execute on function public.consume_security_rate_limit(text, integer, integer)
to service_role;

create policy "service-only payout routing"
on public.organization_payment_destinations for all to anon, authenticated
using (false)
with check (false);

alter table public.program_submissions
  add constraint program_submissions_source_url_length_check
    check (char_length(public_source_url) between 9 and 2048),
  add constraint program_submissions_domain_length_check
    check (official_domain is null or char_length(official_domain) between 1 and 253),
  add constraint program_submissions_trimmed_text_check
    check (
      organization_name = btrim(organization_name)
      and program_name = btrim(program_name)
      and location = btrim(location)
      and summary = btrim(summary)
    );

alter table public.program_proofs
  add constraint program_proofs_public_url_length_check
    check (public_url is null or char_length(public_url) between 9 and 2048),
  add constraint program_proofs_label_trimmed_check
    check (label = btrim(label));

create index organization_payment_destinations_submitted_by_idx
on public.organization_payment_destinations (submitted_by);

create index organization_payment_destinations_reviewed_by_idx
on public.organization_payment_destinations (reviewed_by)
where reviewed_by is not null;
