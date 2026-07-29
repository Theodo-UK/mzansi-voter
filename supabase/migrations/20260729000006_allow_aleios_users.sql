create or replace function public.is_allowed_office_email(candidate_email text)
returns boolean
language sql
immutable
strict
set search_path = ''
as $$
  select lower(trim(candidate_email))
    ~ '^[^@[:space:]]+@(theodo|aleios)[.]com$';
$$;

create or replace function public.hook_restrict_theodo_signup(event jsonb)
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  incoming_email text := lower(trim(event->'user'->>'email'));
  incoming_provider text := event->'user'->'app_metadata'->>'provider';
begin
  if incoming_provider is distinct from 'google'
     or incoming_email is null
     or not public.is_allowed_office_email(incoming_email) then
    return jsonb_build_object(
      'error',
      jsonb_build_object(
        'http_code', 403,
        'message',
        'Use a verified Theodo or Aleios Google account for Mzansi Voter.'
      )
    );
  end if;

  return '{}'::jsonb;
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
  assigned_role public.membership_role := 'member';
begin
  if new.raw_app_meta_data->>'provider' is distinct from 'google'
     or normalised_email is null
     or not public.is_allowed_office_email(normalised_email) then
    raise exception
      'Use a verified Theodo or Aleios Google account for Mzansi Voter.';
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

create or replace function public.is_verified_theodo_user()
returns boolean
language sql
stable
set search_path = ''
as $$
  select coalesce(
    auth.jwt()->'app_metadata'->>'provider' = 'google'
    and public.is_allowed_office_email(auth.jwt()->>'email'),
    false
  );
$$;
