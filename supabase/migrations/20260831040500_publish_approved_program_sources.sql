insert into public.external_campaign_sources (
  slug,
  organization_name,
  title,
  location,
  summary,
  official_source_url,
  donation_url,
  source_domain,
  source_health,
  last_checked_at,
  last_success_at,
  consecutive_failures,
  is_visible
)
select
  coalesce(
    nullif(
      trim(both '-' from left(
        lower(regexp_replace(submission.program_name, '[^a-zA-Z0-9]+', '-', 'g')),
        80
      )),
      ''
    ),
    'program'
  ) || '-' || left(replace(submission.id::text, '-', ''), 8),
  submission.organization_name,
  submission.program_name,
  submission.location,
  submission.summary,
  submission.public_source_url,
  submission.public_source_url,
  coalesce(
    submission.official_domain,
    lower(substring(submission.public_source_url from '^https://([^/]+)'))
  ),
  'healthy'::public.source_health,
  now(),
  now(),
  0,
  true
from public.program_submissions submission
where submission.id = '59d3772c-1d55-45e5-800f-1f66fb7b0079'
  and submission.status = 'approved'
on conflict (official_source_url) do update set
  organization_name = excluded.organization_name,
  title = excluded.title,
  location = excluded.location,
  summary = excluded.summary,
  donation_url = excluded.donation_url,
  source_domain = excluded.source_domain,
  source_health = excluded.source_health,
  last_checked_at = excluded.last_checked_at,
  last_success_at = excluded.last_success_at,
  consecutive_failures = excluded.consecutive_failures,
  is_visible = true,
  updated_at = now();
