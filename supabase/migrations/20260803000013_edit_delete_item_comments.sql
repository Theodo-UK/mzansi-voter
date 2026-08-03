grant update (body), delete on table public.item_comments to authenticated;

create policy "Authors can edit their item comments"
on public.item_comments for update
to authenticated
using (
  author_id = auth.uid()
  and exists (
    select 1
    from public.items
    where items.id = item_comments.item_id
      and public.is_group_member(items.group_id)
  )
)
with check (author_id = auth.uid());

create policy "Authors can delete their item comments"
on public.item_comments for delete
to authenticated
using (
  author_id = auth.uid()
  and exists (
    select 1
    from public.items
    where items.id = item_comments.item_id
      and public.is_group_member(items.group_id)
  )
);
