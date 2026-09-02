create index if not exists security_rate_limits_updated_at_idx
on private.security_rate_limits (updated_at);

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
  v_now timestamptz := clock_timestamp();
begin
  if p_key_hash !~ '^[0-9a-f]{64}$'
    or p_limit < 1
    or p_limit > 1000
    or p_window_seconds < 10
    or p_window_seconds > 86400
  then
    raise exception 'Invalid rate-limit parameters.' using errcode = '22023';
  end if;

  delete from private.security_rate_limits
  where key_hash in (
    select stale.key_hash
    from private.security_rate_limits stale
    where stale.updated_at < v_now - interval '2 days'
    order by stale.updated_at
    limit 100
  );

  insert into private.security_rate_limits (key_hash, attempts, window_started_at, updated_at)
  values (p_key_hash, 0, v_now, v_now)
  on conflict (key_hash) do nothing;

  select *
  into counter
  from private.security_rate_limits
  where key_hash = p_key_hash
  for update;

  if counter.window_started_at + make_interval(secs => p_window_seconds) <= v_now then
    update private.security_rate_limits
    set attempts = 1, window_started_at = v_now, updated_at = v_now
    where key_hash = p_key_hash;
    return true;
  end if;

  if counter.attempts >= p_limit then
    return false;
  end if;

  update private.security_rate_limits
  set attempts = attempts + 1, updated_at = v_now
  where key_hash = p_key_hash;
  return true;
end;
$$;

revoke all on function public.consume_security_rate_limit(text, integer, integer)
from public, anon, authenticated;
grant execute on function public.consume_security_rate_limit(text, integer, integer)
to service_role;
