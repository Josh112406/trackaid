alter table private.admin_invitations
add column invited_by uuid references auth.users (id) on delete set null;

create or replace function public.create_admin_invitation(
  p_email text,
  p_role public.app_admin_role,
  p_token_hash text,
  p_expires_at timestamptz
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  invitation_id uuid;
  existing_invitation private.admin_invitations%rowtype;
begin
  if auth.uid() is null or not exists (
    select 1
    from public.app_admins administrator
    where administrator.user_id = auth.uid()
      and administrator.role = 'owner'
  ) then
    raise exception 'Owner access is required.' using errcode = '42501';
  end if;

  if p_email is null
    or p_email <> lower(p_email)
    or char_length(p_email) not between 5 and 254
    or p_email !~ '^[^[:space:]@]+@[^[:space:]@]+\.[^[:space:]@]+$'
    or p_role not in ('reviewer', 'auditor')
    or p_token_hash !~ '^[0-9a-f]{64}$'
    or p_expires_at <= now()
    or p_expires_at > now() + interval '7 days'
  then
    raise exception 'The invitation details are invalid.' using errcode = '22023';
  end if;

  select candidate.*
  into existing_invitation
  from private.admin_invitations candidate
  where candidate.email = p_email
  for update;

  if found and existing_invitation.accepted_at is not null then
    raise exception 'This email already accepted an administrator invitation.' using errcode = '23505';
  end if;

  insert into private.admin_invitations (
    email,
    role,
    token_hash,
    expires_at,
    invited_by
  )
  values (
    p_email,
    p_role,
    p_token_hash,
    p_expires_at,
    auth.uid()
  )
  on conflict (email) do update
  set role = excluded.role,
      token_hash = excluded.token_hash,
      expires_at = excluded.expires_at,
      invited_by = excluded.invited_by,
      accepted_at = null,
      accepted_user_id = null
  returning id into invitation_id;

  insert into public.admin_audit_log (
    actor_user_id,
    action,
    entity_type,
    entity_id,
    detail
  )
  values (
    auth.uid(),
    'Created administrator invitation',
    'admin_invitation',
    invitation_id::text,
    jsonb_build_object('email', p_email, 'role', p_role::text, 'expires_at', p_expires_at)
  );

  return invitation_id;
end;
$$;

revoke all on function public.create_admin_invitation(text, public.app_admin_role, text, timestamptz)
from public, anon;
grant execute on function public.create_admin_invitation(text, public.app_admin_role, text, timestamptz)
to authenticated;

create or replace function private.accept_admin_invitation()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  invitation_id uuid;
  invited_role public.app_admin_role;
  inviter_id uuid;
begin
  invitation_id := nullif(new.raw_app_meta_data ->> 'trackaid_invitation_id', '')::uuid;

  if invitation_id is null then
    return new;
  end if;

  update private.admin_invitations
  set accepted_at = now(), accepted_user_id = new.id
  where id = invitation_id
    and email = lower(new.email)
    and accepted_at is null
    and expires_at > now()
  returning role, invited_by into invited_role, inviter_id;

  if invited_role is null then
    raise exception 'The administrator invitation could not be accepted.' using errcode = 'P0001';
  end if;

  insert into public.app_admins (user_id, role, invited_by)
  values (new.id, invited_role, inviter_id);

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
    jsonb_build_object('role', invited_role::text, 'invited_by', inviter_id)
  );

  return new;
end;
$$;

revoke all on function private.accept_admin_invitation() from public, anon, authenticated;
