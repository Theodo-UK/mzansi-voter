-- The order cutoff is Cape Town wall-clock time; votes lock once it passes.
create or replace function public.is_voting_open(target_group_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select coalesce(
    (
      select (next_order_date + cutoff_time)
        at time zone 'Africa/Johannesburg' > now()
      from public.groups
      where id = target_group_id
    ),
    false
  );
$$;

revoke execute on function public.is_voting_open(uuid) from anon, public;
grant execute on function public.is_voting_open(uuid) to authenticated;
grant select, insert, update, delete on table public.votes to authenticated;

alter policy "Members can cast their own vote"
on public.votes
with check (
  user_id = auth.uid()
  and exists (
    select 1
    from public.items
    where items.id = votes.item_id
      and items.locked = false
      and items.skipped = false
      and public.is_group_member(items.group_id)
      and public.is_voting_open(items.group_id)
  )
);

alter policy "Members can change their own vote"
on public.votes
with check (
  user_id = auth.uid()
  and exists (
    select 1
    from public.items
    where items.id = votes.item_id
      and items.locked = false
      and items.skipped = false
      and public.is_group_member(items.group_id)
      and public.is_voting_open(items.group_id)
  )
);

alter policy "Members can remove their own vote"
on public.votes
using (
  public.is_verified_theodo_user()
  and user_id = auth.uid()
  and exists (
    select 1
    from public.items
    where items.id = votes.item_id
      and public.is_voting_open(items.group_id)
  )
);
