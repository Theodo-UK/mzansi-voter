create or replace function public.remove_group_admin(
  target_group_id uuid,
  target_email text
)
returns boolean
language plpgsql
security definer
set search_path = ''
as $$
declare
  normalised_email text := lower(trim(target_email));
  caller_email text := lower(trim(auth.jwt()->>'email'));
  target_user_id uuid;
  demoted_count integer;
begin
  if not public.is_group_admin(target_group_id) then
    raise exception 'Only group admins can remove another admin.';
  end if;

  if normalised_email is null
     or not public.is_allowed_office_email(normalised_email) then
    raise exception 'Use a verified Theodo or Aleios email address.';
  end if;

  if normalised_email = caller_email then
    raise exception 'Admins cannot remove their own access.';
  end if;

  delete from public.group_admin_emails
  where group_id = target_group_id
    and email = normalised_email;

  select id
  into target_user_id
  from auth.users
  where lower(trim(email)) = normalised_email
  limit 1;

  if target_user_id is null then
    return false;
  end if;

  update public.group_members
  set role = 'member'
  where group_id = target_group_id
    and user_id = target_user_id;

  get diagnostics demoted_count = row_count;
  return demoted_count > 0;
end;
$$;

revoke execute on function public.remove_group_admin(uuid, text)
from anon, public;
grant execute on function public.remove_group_admin(uuid, text)
to authenticated;
