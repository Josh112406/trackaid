revoke execute on function public.verify_source_monitor_secret(text) from anon, authenticated;
grant execute on function public.verify_source_monitor_secret(text) to service_role;
