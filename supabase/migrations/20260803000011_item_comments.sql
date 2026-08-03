create table public.item_comments (
  id uuid primary key default gen_random_uuid(),
  item_id uuid not null references public.items (id) on delete cascade,
  author_id uuid not null references public.profiles (id) on delete cascade,
  body text not null
    check (char_length(trim(body)) between 1 and 500),
  created_at timestamptz not null default now()
);

create index item_comments_item_created_at_idx
on public.item_comments (item_id, created_at);

alter table public.item_comments enable row level security;

grant select, insert on table public.item_comments to authenticated;
grant select on table public.items to authenticated;

create policy "Members can read item comments"
on public.item_comments for select
to authenticated
using (
  exists (
    select 1
    from public.items
    where items.id = item_comments.item_id
      and public.is_group_member(items.group_id)
  )
);

create policy "Members can add their own item comments"
on public.item_comments for insert
to authenticated
with check (
  author_id = auth.uid()
  and exists (
    select 1
    from public.items
    where items.id = item_comments.item_id
      and public.is_group_member(items.group_id)
  )
);

alter publication supabase_realtime add table public.item_comments;
