alter table public.items
add column availability_status text not null default 'unknown'
check (availability_status in ('available', 'out_of_stock', 'unknown'));

alter table public.items
add column availability_checked_at timestamptz;

grant update (
  product_url,
  availability_status,
  availability_checked_at
) on public.items to service_role;

create or replace function public.reset_item_availability()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if new.product_url is distinct from old.product_url then
    new.availability_status = 'unknown';
    new.availability_checked_at = null;
  end if;

  return new;
end;
$$;

create trigger items_reset_availability
before update of product_url on public.items
for each row execute procedure public.reset_item_availability();

revoke execute on function public.reset_item_availability()
from anon, authenticated, public;

update public.items
set product_url = regexp_replace(
  product_url,
  '63f5e22120877749070ca371$',
  '10819910EA'
)
where product_url ~ '63f5e22120877749070ca371$';
