begin;

select plan(6);

select has_column(
  'public',
  'items',
  'availability_status',
  'items cache product availability'
);
select has_column(
  'public',
  'items',
  'availability_checked_at',
  'items remember when availability was checked'
);
select ok(
  has_column_privilege(
    'service_role',
    'public.items',
    'availability_status',
    'update'
  ),
  'the availability function can update cached status'
);

insert into auth.users (
  instance_id,
  id,
  aud,
  role,
  email,
  raw_app_meta_data,
  raw_user_meta_data
)
values (
  '00000000-0000-0000-0000-000000000000',
  '50000000-0000-4000-8000-000000000001',
  'authenticated',
  'authenticated',
  'availability.admin@theodo.com',
  '{"provider":"google","providers":["google"]}'::jsonb,
  '{}'::jsonb
);

insert into public.items (
  id,
  group_id,
  name,
  price_cents,
  product_url,
  purchase_type,
  created_by,
  availability_status,
  availability_checked_at
)
values (
  '60000000-0000-4000-8000-000000000001',
  '00000000-0000-4000-8000-000000000001',
  'Cached product',
  1000,
  'https://www.checkers.co.za/product/cached-10000000EA',
  'recurring',
  '50000000-0000-4000-8000-000000000001',
  'available',
  now()
);

select is(
  (
    select availability_status
    from public.items
    where id = '60000000-0000-4000-8000-000000000001'
  ),
  'available',
  'availability can be cached'
);

update public.items
set product_url = 'https://www.checkers.co.za/product/replacement-10000001EA'
where id = '60000000-0000-4000-8000-000000000001';

select is(
  (
    select availability_status
    from public.items
    where id = '60000000-0000-4000-8000-000000000001'
  ),
  'unknown',
  'changing the product URL clears cached availability'
);
select is(
  (
    select availability_checked_at
    from public.items
    where id = '60000000-0000-4000-8000-000000000001'
  ),
  null,
  'changing the product URL clears the checked time'
);

select * from finish();
rollback;
