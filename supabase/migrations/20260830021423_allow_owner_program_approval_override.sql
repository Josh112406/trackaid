alter table public.program_submissions
  drop constraint program_submissions_independent_review_check;

create or replace function private.enforce_program_review_assignment()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if new.reviewed_by is not null
    and new.reviewed_by = new.submitted_by
    and (
      new.status <> 'approved'
      or not exists (
        select 1
        from public.app_admins administrator
        where administrator.user_id = new.reviewed_by
          and administrator.role = 'owner'
      )
    )
  then
    raise exception 'Only an owner may approve their own program submission.'
      using errcode = '23514';
  end if;

  return new;
end;
$$;

revoke execute on function private.enforce_program_review_assignment() from public;

create trigger program_submissions_enforce_review_assignment
before insert or update of status, reviewed_by, submitted_by on public.program_submissions
for each row execute function private.enforce_program_review_assignment();

drop policy "submitters and reviewers update submissions"
on public.program_submissions;

create policy "submitters and reviewers update submissions"
on public.program_submissions for update to authenticated
using (
  (
    submitted_by = (select auth.uid())
    and status in ('draft', 'needs_information')
  )
  or (select private.is_app_admin(array['owner', 'reviewer']::public.app_admin_role[]))
)
with check (
  (
    submitted_by = (select auth.uid())
    and status in ('draft', 'submitted')
  )
  or (
    (select private.is_app_admin(array['owner', 'reviewer']::public.app_admin_role[]))
    and (
      reviewed_by is null
      or reviewed_by <> submitted_by
      or (
        status = 'approved'
        and reviewed_by = (select auth.uid())
        and (select private.is_app_admin(array['owner']::public.app_admin_role[]))
      )
    )
  )
);

create or replace function private.queue_program_approval_anchor()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  proof_fingerprints text;
  approval_payload text;
begin
  if new.status = 'approved' and old.status is distinct from 'approved' then
    select coalesce(string_agg(proof.sha256, ',' order by proof.sha256), '')
    into proof_fingerprints
    from public.program_proofs proof
    where proof.submission_id = new.id;

    approval_payload := concat_ws(
      ':',
      new.id::text,
      new.organization_name,
      new.program_name,
      new.official_domain,
      new.reviewed_at::text,
      proof_fingerprints
    );

    insert into public.ledger_jobs (
      entity_type,
      entity_id,
      program_submission_id,
      amount_centavos,
      payload_hash
    ) values (
      'program_approval',
      new.id,
      new.id,
      0,
      '0x' || encode(extensions.digest(approval_payload, 'sha256'), 'hex')
    ) on conflict (entity_type, entity_id) do nothing;

    insert into public.admin_audit_log (
      actor_user_id,
      action,
      entity_type,
      entity_id,
      detail
    ) values (
      new.reviewed_by,
      'program_approved_and_anchor_queued',
      'program_submission',
      new.id::text,
      jsonb_build_object(
        'proof_count', cardinality(string_to_array(proof_fingerprints, ',')),
        'owner_override', new.reviewed_by = new.submitted_by
      )
    );
  end if;
  return new;
end;
$$;
