begin;

select plan(9);

select has_table('public', 'item_comments', 'item comments are stored');

insert into public.group_admin_emails (group_id, email)
values (
  '00000000-0000-4000-8000-000000000001',
  'comments.admin@theodo.com'
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
  '30000000-0000-4000-8000-000000000001',
  'authenticated',
  'authenticated',
  'comments.admin@theodo.com',
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
  created_by
)
values
  (
    '40000000-0000-4000-8000-000000000001',
    '00000000-0000-4000-8000-000000000001',
    'Recurring item',
    1000,
    'https://example.com/recurring',
    'recurring',
    '30000000-0000-4000-8000-000000000001'
  ),
  (
    '40000000-0000-4000-8000-000000000002',
    '00000000-0000-4000-8000-000000000001',
    'One-off item',
    1000,
    'https://example.com/one-off',
    'one_off',
    '30000000-0000-4000-8000-000000000001'
  );

set local role authenticated;
select set_config(
  'request.jwt.claims',
  jsonb_build_object(
    'sub',
    '30000000-0000-4000-8000-000000000001',
    'email',
    'comments.admin@theodo.com',
    'app_metadata',
    jsonb_build_object('provider', 'google')
  )::text,
  true
);

select lives_ok(
  $$
    insert into public.item_comments (item_id, author_id, body)
    values
      (
        '40000000-0000-4000-8000-000000000001',
        '30000000-0000-4000-8000-000000000001',
        'Keep this discussion'
      ),
      (
        '40000000-0000-4000-8000-000000000002',
        '30000000-0000-4000-8000-000000000001',
        'Remove this with the item'
      )
  $$,
  'members can comment on group items'
);

select lives_ok(
  $$
    update public.item_comments
    set body = 'Keep this updated discussion'
    where item_id = '40000000-0000-4000-8000-000000000001'
  $$,
  'authors can edit their comments'
);

select is(
  (
    select body
    from public.item_comments
    where item_id = '40000000-0000-4000-8000-000000000001'
  ),
  'Keep this updated discussion',
  'edited comments keep their new body'
);

select is(
  (select count(*)::integer from public.item_comments),
  2,
  'members can read comments on group items'
);

select public.start_next_cycle(
  '00000000-0000-4000-8000-000000000001',
  array['40000000-0000-4000-8000-000000000002']::uuid[]
);

set local role postgres;

select is(
  (
    select count(*)::integer
    from public.item_comments
    where item_id = '40000000-0000-4000-8000-000000000001'
  ),
  1,
  'comments survive a vote-cycle reset while their item remains'
);

select is(
  (
    select count(*)::integer
    from public.item_comments
    where item_id = '40000000-0000-4000-8000-000000000002'
  ),
  0,
  'comments are deleted with one-off items'
);

set local role authenticated;

select lives_ok(
  $$
    delete from public.item_comments
    where item_id = '40000000-0000-4000-8000-000000000001'
  $$,
  'authors can delete their comments'
);

select is(
  (select count(*)::integer from public.item_comments),
  0,
  'deleted comments are removed'
);

select * from finish();
rollback;
