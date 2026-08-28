create index admin_invitations_accepted_user_id_idx
on private.admin_invitations (accepted_user_id)
where accepted_user_id is not null;
