create type public.membership_role as enum ('member', 'admin');
create type public.purchase_type as enum ('recurring', 'one_off');

create table public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  display_name text not null check (char_length(display_name) > 0),
  created_at timestamptz not null default now()
);

create table public.groups (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  currency text not null default 'ZAR' check (currency = 'ZAR'),
  retailer text not null default 'Checkers'
    check (char_length(trim(retailer)) >= 2),
  budget_cents integer not null check (budget_cents > 0),
  next_order_date date not null default (
    current_date + ((5 - extract(dow from current_date)::integer + 7) % 7)
  ),
  cutoff_time time not null default '10:00',
  created_at timestamptz not null default now()
);

create table public.group_members (
  group_id uuid not null references public.groups (id) on delete cascade,
  user_id uuid not null references public.profiles (id) on delete cascade,
  role public.membership_role not null default 'member',
  created_at timestamptz not null default now(),
  primary key (group_id, user_id)
);

create table public.items (
  id uuid primary key default gen_random_uuid(),
  group_id uuid not null references public.groups (id) on delete cascade,
  name text not null check (char_length(trim(name)) >= 2),
  price_cents integer not null check (price_cents > 0),
  product_url text not null check (product_url ~ '^https://'),
  purchase_type public.purchase_type not null default 'recurring',
  locked boolean not null default false,
  skipped boolean not null default false,
  created_by uuid not null references public.profiles (id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.votes (
  item_id uuid not null references public.items (id) on delete cascade,
  user_id uuid not null references public.profiles (id) on delete cascade,
  value smallint not null check (value in (-1, 1)),
  updated_at timestamptz not null default now(),
  primary key (item_id, user_id)
);

create index items_group_id_idx on public.items (group_id);
create index votes_item_id_idx on public.votes (item_id);
create index group_members_user_id_idx on public.group_members (user_id);

insert into public.groups (
  id,
  name,
  currency,
  retailer,
  budget_cents,
  cutoff_time
)
values (
  '00000000-0000-4000-8000-000000000001',
  'Cape Town',
  'ZAR',
  'Checkers',
  100000,
  '10:00'
);

create or replace function public.derive_display_name(email text)
returns text
language sql
immutable
strict
set search_path = ''
as $$
  select string_agg(initcap(segment), '' order by position)
  from unnest(
    string_to_array(split_part(lower(trim(email)), '@', 1), '.')
  ) with ordinality as parts(segment, position)
  where segment <> '';
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
     or incoming_email !~ '^[^@[:space:]]+@theodo[.]com$' then
    return jsonb_build_object(
      'error',
      jsonb_build_object(
        'http_code', 403,
        'message', 'Use a verified Theodo Google account for Mzansi Voter.'
      )
    );
  end if;

  return '{}'::jsonb;
end;
$$;

grant execute on function public.hook_restrict_theodo_signup(jsonb)
to supabase_auth_admin;
revoke execute on function public.hook_restrict_theodo_signup(jsonb)
from authenticated, anon, public;

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

  if normalised_email = 'liam.hitchcock@theodo.com' then
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

create trigger on_auth_user_created
after insert on auth.users
for each row execute procedure public.handle_new_user();

create or replace function public.set_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger items_set_updated_at
before update on public.items
for each row execute procedure public.set_updated_at();

create trigger votes_set_updated_at
before update on public.votes
for each row execute procedure public.set_updated_at();

create or replace function public.is_verified_theodo_user()
returns boolean
language sql
stable
set search_path = ''
as $$
  select coalesce(
    auth.jwt()->'app_metadata'->>'provider' = 'google'
    and lower(trim(auth.jwt()->>'email')) ~ '^[^@[:space:]]+@theodo[.]com$',
    false
  );
$$;

create or replace function public.is_group_member(target_group_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select public.is_verified_theodo_user() and exists (
    select 1
    from public.group_members
    where group_id = target_group_id
      and user_id = auth.uid()
  );
$$;

create or replace function public.is_group_admin(target_group_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select public.is_verified_theodo_user() and exists (
    select 1
    from public.group_members
    where group_id = target_group_id
      and user_id = auth.uid()
      and role = 'admin'
  );
$$;

create or replace function public.shares_group_with(target_user_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select public.is_verified_theodo_user() and exists (
    select 1
    from public.group_members mine
    join public.group_members theirs
      on theirs.group_id = mine.group_id
    where mine.user_id = auth.uid()
      and theirs.user_id = target_user_id
  );
$$;

alter table public.profiles enable row level security;
alter table public.groups enable row level security;
alter table public.group_members enable row level security;
alter table public.items enable row level security;
alter table public.votes enable row level security;

create policy "Members can read group profiles"
on public.profiles for select
to authenticated
using (
  public.is_verified_theodo_user()
  and (id = auth.uid() or public.shares_group_with(id))
);

create policy "Members can read their groups"
on public.groups for select
to authenticated
using (public.is_group_member(id));

create policy "Admins can update their groups"
on public.groups for update
to authenticated
using (public.is_group_admin(id))
with check (public.is_group_admin(id));

create policy "Members can read group memberships"
on public.group_members for select
to authenticated
using (public.is_group_member(group_id));

create policy "Members can read group items"
on public.items for select
to authenticated
using (public.is_group_member(group_id));

create policy "Members can suggest group items"
on public.items for insert
to authenticated
with check (
  created_by = auth.uid()
  and public.is_group_member(group_id)
  and locked = false
  and skipped = false
);

create policy "Admins can update group items"
on public.items for update
to authenticated
using (public.is_group_admin(group_id))
with check (public.is_group_admin(group_id));

create policy "Admins can delete group items"
on public.items for delete
to authenticated
using (public.is_group_admin(group_id));

create policy "Members can read group votes"
on public.votes for select
to authenticated
using (
  exists (
    select 1
    from public.items
    where items.id = votes.item_id
      and public.is_group_member(items.group_id)
  )
);

create policy "Members can cast their own vote"
on public.votes for insert
to authenticated
with check (
  user_id = auth.uid()
  and exists (
    select 1
    from public.items
    where items.id = votes.item_id
      and items.locked = false
      and items.skipped = false
      and public.is_group_member(items.group_id)
  )
);

create policy "Members can change their own vote"
on public.votes for update
to authenticated
using (user_id = auth.uid())
with check (
  user_id = auth.uid()
  and exists (
    select 1
    from public.items
    where items.id = votes.item_id
      and items.locked = false
      and items.skipped = false
      and public.is_group_member(items.group_id)
  )
);

create policy "Members can remove their own vote"
on public.votes for delete
to authenticated
using (public.is_verified_theodo_user() and user_id = auth.uid());

create or replace function public.start_next_cycle(
  target_group_id uuid,
  accepted_item_ids uuid[]
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  if not public.is_group_admin(target_group_id) then
    raise exception 'Only group admins can start a new shopping cycle.';
  end if;

  delete from public.items
  where group_id = target_group_id
    and purchase_type = 'one_off'
    and id = any(accepted_item_ids);

  delete from public.votes
  where item_id in (
    select id
    from public.items
    where group_id = target_group_id
  );

  update public.items
  set skipped = false
  where group_id = target_group_id
    and skipped = true;
end;
$$;

revoke execute on function public.start_next_cycle(uuid, uuid[])
from anon, public;
grant execute on function public.start_next_cycle(uuid, uuid[])
to authenticated;

alter publication supabase_realtime add table public.items;
alter publication supabase_realtime add table public.votes;
alter publication supabase_realtime add table public.groups;
