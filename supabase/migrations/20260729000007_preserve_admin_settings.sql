alter table public.group_admin_emails
drop constraint if exists group_admin_emails_email_check;

alter table public.group_admin_emails
add constraint group_admin_emails_email_check
check (
  email = lower(trim(email))
  and public.is_allowed_office_email(email)
);

create or replace function public.add_group_admin(
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
  target_user_id uuid;
  promoted_count integer;
begin
  if not public.is_group_admin(target_group_id) then
    raise exception 'Only group admins can add another admin.';
  end if;

  if normalised_email is null
     or not public.is_allowed_office_email(normalised_email) then
    raise exception 'Use a verified Theodo or Aleios email address.';
  end if;

  insert into public.group_admin_emails (group_id, email, added_by)
  values (target_group_id, normalised_email, auth.uid())
  on conflict (group_id, email) do nothing;

  select id
  into target_user_id
  from auth.users
  where lower(trim(email)) = normalised_email
  limit 1;

  if target_user_id is null then
    return false;
  end if;

  update public.group_members
  set role = 'admin'
  where group_id = target_group_id
    and user_id = target_user_id;

  get diagnostics promoted_count = row_count;
  return promoted_count > 0;
end;
$$;

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  normalised_email text := lower(trim(new.email));
  target_group_id constant uuid :=
    '00000000-0000-4000-8000-000000000001';
  assigned_role public.membership_role := 'member';
begin
  if new.raw_app_meta_data->>'provider' is distinct from 'google'
     or normalised_email is null
     or not public.is_allowed_office_email(normalised_email) then
    raise exception
      'Use a verified Theodo or Aleios Google account for Mzansi Voter.';
  end if;

  if exists (
    select 1
    from public.group_admin_emails
    where group_id = target_group_id
      and email = normalised_email
  ) then
    assigned_role := 'admin';
  end if;

  insert into public.profiles (id, display_name)
  values (new.id, public.derive_display_name(normalised_email));

  insert into public.group_members (group_id, user_id, role)
  values (target_group_id, new.id, assigned_role);

  return new;
end;
$$;
