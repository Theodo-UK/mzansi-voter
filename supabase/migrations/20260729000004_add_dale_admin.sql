create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  normalised_email text := lower(trim(new.email));
  assigned_role public.membership_role := 'member';
begin
  if new.raw_app_meta_data->>'provider' is distinct from 'google'
     or normalised_email is null
     or normalised_email !~ '^[^@[:space:]]+@theodo[.]com$' then
    raise exception 'Use a verified Theodo Google account for Mzansi Voter.';
  end if;

  if normalised_email in (
    'liam.hitchcock@theodo.com',
    'dale.maske@theodo.com'
  ) then
    assigned_role := 'admin';
  end if;

  insert into public.profiles (id, display_name)
  values (new.id, public.derive_display_name(normalised_email));

  insert into public.group_members (group_id, user_id, role)
  values (
    '00000000-0000-4000-8000-000000000001',
    new.id,
    assigned_role
  );

  return new;
end;
$$;

update public.group_members as membership
set role = 'admin'
from auth.users as auth_user
where membership.user_id = auth_user.id
  and membership.group_id = '00000000-0000-4000-8000-000000000001'
  and lower(trim(auth_user.email)) = 'dale.maske@theodo.com';
