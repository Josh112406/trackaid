create policy "no direct rate limit access"
on private.security_rate_limits for all to anon, authenticated
using (false)
with check (false);
