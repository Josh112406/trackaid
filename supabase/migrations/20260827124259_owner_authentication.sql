create table private.admin_invitations (
  id uuid primary key default gen_random_uuid(),
  email text not null unique,
  role public.app_admin_role not null default 'auditor',
  token_hash text not null unique check (token_hash ~ '^[0-9a-f]{64}$'),
  expires_at timestamptz not null,
  accepted_at timestamptz,
  accepted_user_id uuid references auth.users (id) on delete set null,
  created_at timestamptz not null default now(),
  constraint admin_invitations_email_lowercase check (email = lower(email)),
  constraint admin_invitations_expiry_check check (expires_at > created_at),
  constraint admin_invitations_acceptance_check check (
    (accepted_at is null and accepted_user_id is null)
    or (accepted_at is not null and accepted_user_id is not null)
  )
);

revoke all on table private.admin_invitations from public, anon, authenticated;

create or replace function private.validate_admin_invitation()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  invitation private.admin_invitations%rowtype;
  supplied_token text;
begin
  supplied_token := new.raw_user_meta_data ->> 'admin_setup_token';

  if new.email is null or supplied_token is null or char_length(supplied_token) < 32 then
    raise exception 'A valid administrator invitation is required.' using errcode = 'P0001';
  end if;

  select candidate.*
  into invitation
  from private.admin_invitations candidate
  where candidate.email = lower(new.email)
    and candidate.token_hash = encode(extensions.digest(supplied_token, 'sha256'), 'hex')
    and candidate.accepted_at is null
    and candidate.expires_at > now()
  for update;

  if not found then
    raise exception 'A valid administrator invitation is required.' using errcode = 'P0001';
  end if;

  new.raw_user_meta_data := coalesce(new.raw_user_meta_data, '{}'::jsonb) - 'admin_setup_token';
  new.raw_app_meta_data := coalesce(new.raw_app_meta_data, '{}'::jsonb)
    || jsonb_build_object('trackaid_invitation_id', invitation.id::text);

  return new;
end;
$$;

create or replace function private.accept_admin_invitation()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  invitation_id uuid;
  invited_role public.app_admin_role;
begin
  invitation_id := nullif(new.raw_app_meta_data ->> 'trackaid_invitation_id', '')::uuid;

  update private.admin_invitations
  set accepted_at = now(), accepted_user_id = new.id
  where id = invitation_id
    and email = lower(new.email)
    and accepted_at is null
    and expires_at > now()
  returning role into invited_role;

  if invited_role is null then
    raise exception 'The administrator invitation could not be accepted.' using errcode = 'P0001';
  end if;

  insert into public.app_admins (user_id, role)
  values (new.id, invited_role);

  insert into public.admin_audit_log (
    actor_user_id,
    action,
    entity_type,
    entity_id,
    detail
  )
  values (
    new.id,
    'Accepted administrator invitation',
    'app_admin',
    new.id::text,
    jsonb_build_object('role', invited_role::text)
  );

  return new;
end;
$$;

revoke all on function private.validate_admin_invitation() from public, anon, authenticated;
revoke all on function private.accept_admin_invitation() from public, anon, authenticated;

create trigger trackaid_validate_admin_invitation_before_insert
before insert on auth.users
for each row execute function private.validate_admin_invitation();

create trigger trackaid_accept_admin_invitation_after_insert
after insert on auth.users
for each row execute function private.accept_admin_invitation();
