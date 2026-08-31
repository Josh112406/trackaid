alter table public.program_submissions
  add column campaign_id uuid unique references public.campaigns (id) on delete set null;

comment on column public.program_submissions.campaign_id is
  'The published TrackAid campaign created from this approved submission.';
