begin;

select plan(6);

update public.groups
set next_order_date = current_date + 7, cutoff_time = '10:00'
where id = '00000000-0000-4000-8000-000000000001';

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
  'vote.lock@theodo.com',
  '{"provider":"google","providers":["google"]}'::jsonb,
  '{}'::jsonb
);

insert into public.items (
  id,
  group_id,
  name,
  price_cents,
  product_url,
  created_by
)
values
  (
    '60000000-0000-4000-8000-000000000001',
    '00000000-0000-4000-8000-000000000001',
    'Rooibos',
    4500,
    'https://example.com/rooibos',
    '50000000-0000-4000-8000-000000000001'
  ),
  (
    '60000000-0000-4000-8000-000000000002',
    '00000000-0000-4000-8000-000000000001',
    'Rusks',
    6500,
    'https://example.com/rusks',
    '50000000-0000-4000-8000-000000000001'
  );

set local role authenticated;
select set_config(
  'request.jwt.claims',
  jsonb_build_object(
    'sub',
    '50000000-0000-4000-8000-000000000001',
    'email',
    'vote.lock@theodo.com',
    'app_metadata',
    jsonb_build_object('provider', 'google')
  )::text,
  true
);

select lives_ok(
  $$
    insert into public.votes (item_id, user_id, value)
    values (
      '60000000-0000-4000-8000-000000000001',
      '50000000-0000-4000-8000-000000000001',
      1
    )
  $$,
  'members can vote before the cutoff'
);

set local role postgres;

update public.groups
set next_order_date = current_date - 1
where id = '00000000-0000-4000-8000-000000000001';

set local role authenticated;

select throws_ok(
  $$
    insert into public.votes (item_id, user_id, value)
    values (
      '60000000-0000-4000-8000-000000000002',
      '50000000-0000-4000-8000-000000000001',
      1
    )
  $$,
  '42501',
  null,
  'members cannot cast a vote after the cutoff'
);

select throws_ok(
  $$
    insert into public.votes (item_id, user_id, value)
    values (
      '60000000-0000-4000-8000-000000000001',
      '50000000-0000-4000-8000-000000000001',
      -1
    )
    on conflict (item_id, user_id) do update set value = excluded.value
  $$,
  '42501',
  null,
  'members cannot change a vote after the cutoff'
);

delete from public.votes
where item_id = '60000000-0000-4000-8000-000000000001';

select is(
  (select count(*)::integer from public.votes),
  1,
  'members cannot remove a vote after the cutoff'
);

set local role postgres;

update public.groups
set next_order_date = current_date + 7
where id = '00000000-0000-4000-8000-000000000001';

set local role authenticated;

select lives_ok(
  $$
    delete from public.votes
    where item_id = '60000000-0000-4000-8000-000000000001'
  $$,
  'members can remove a vote once the next ballot opens'
);

select is(
  (select count(*)::integer from public.votes),
  0,
  'reopened ballots accept vote changes'
);

select * from finish();
rollback;
