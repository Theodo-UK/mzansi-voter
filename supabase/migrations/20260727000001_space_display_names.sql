create or replace function public.derive_display_name(email text)
returns text
language sql
immutable
strict
set search_path = ''
as $$
  select string_agg(initcap(segment), ' ' order by position)
  from unnest(
    string_to_array(split_part(lower(trim(email)), '@', 1), '.')
  ) with ordinality as parts(segment, position)
  where segment <> '';
$$;

update public.profiles as profile
set display_name = public.derive_display_name(auth_user.email)
from auth.users as auth_user
where profile.id = auth_user.id
  and auth_user.email is not null;
