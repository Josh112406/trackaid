alter table public.ledger_jobs
  drop constraint ledger_jobs_entity_type_check,
  alter column campaign_id drop not null,
  add column program_submission_id uuid references public.program_submissions (id) on delete restrict,
  add constraint ledger_jobs_entity_type_check check (
    entity_type in ('donation', 'disbursement', 'confirmation', 'program_approval')
  ),
  add constraint ledger_jobs_scope_check check (
    (
      entity_type = 'program_approval'
      and campaign_id is null
      and program_submission_id = entity_id
    )
    or (
      entity_type <> 'program_approval'
      and campaign_id is not null
      and program_submission_id is null
    )
  );

create index ledger_jobs_program_submission_id_idx
on public.ledger_jobs (program_submission_id)
where program_submission_id is not null;

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
      jsonb_build_object('proof_count', cardinality(string_to_array(proof_fingerprints, ',')))
    );
  end if;
  return new;
end;
$$;

create trigger program_submissions_queue_approval_anchor
after update of status on public.program_submissions
for each row execute function private.queue_program_approval_anchor();
