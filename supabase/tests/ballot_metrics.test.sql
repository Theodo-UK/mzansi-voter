begin;

select plan(21);

select has_table(
  'public',
  'group_member_activity',
  'group member voting activity is stored'
);
select has_table(
  'public',
  'ballot_cycles',
  'completed ballot cycles are stored'
);
select has_table(
  'public',
  'ballot_cycle_items',
  'completed cycle item results are stored'
);
select has_function(
  'public',
  'get_ballot_metrics',
  array[]::text[]
);

insert into public.group_admin_emails (group_id, email)
values (
  '00000000-0000-4000-8000-000000000001',
  'fixture.admin@theodo.com'
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
select
  '00000000-0000-0000-0000-000000000000',
  user_id,
  'authenticated',
  'authenticated',
  email,
  '{"provider":"google","providers":["google"]}'::jsonb,
  '{}'::jsonb
from (
  values
    (
      '10000000-0000-4000-8000-000000000001'::uuid,
      'fixture.admin@theodo.com'
    ),
    (
      '10000000-0000-4000-8000-000000000002'::uuid,
      'member.one@theodo.com'
    ),
    (
      '10000000-0000-4000-8000-000000000003'::uuid,
      'member.two@theodo.com'
    ),
    (
      '10000000-0000-4000-8000-000000000004'::uuid,
      'member.three@theodo.com'
    ),
    (
      '10000000-0000-4000-8000-000000000005'::uuid,
      'member.four@theodo.com'
    ),
    (
      '10000000-0000-4000-8000-000000000006'::uuid,
      'member.five@theodo.com'
    )
) as users(user_id, email);

update public.groups
set
  cycle_started_at = now() - interval '7 days',
  cycle_suggestion_count = 0
where id = '00000000-0000-4000-8000-000000000001';

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
    '20000000-0000-4000-8000-000000000001',
    '00000000-0000-4000-8000-000000000001',
    'Favourite',
    1000,
    'https://example.com/favourite',
    'recurring',
    '10000000-0000-4000-8000-000000000001'
  ),
  (
    '20000000-0000-4000-8000-000000000002',
    '00000000-0000-4000-8000-000000000001',
    'Debated',
    1000,
    'https://example.com/debated',
    'recurring',
    '10000000-0000-4000-8000-000000000001'
  ),
  (
    '20000000-0000-4000-8000-000000000003',
    '00000000-0000-4000-8000-000000000001',
    'One off',
    1000,
    'https://example.com/one-off',
    'one_off',
    '10000000-0000-4000-8000-000000000001'
  );

insert into public.votes (item_id, user_id, value)
values
  (
    '20000000-0000-4000-8000-000000000001',
    '10000000-0000-4000-8000-000000000001',
    1
  ),
  (
    '20000000-0000-4000-8000-000000000001',
    '10000000-0000-4000-8000-000000000002',
    1
  ),
  (
    '20000000-0000-4000-8000-000000000001',
    '10000000-0000-4000-8000-000000000003',
    1
  ),
  (
    '20000000-0000-4000-8000-000000000001',
    '10000000-0000-4000-8000-000000000004',
    1
  ),
  (
    '20000000-0000-4000-8000-000000000001',
    '10000000-0000-4000-8000-000000000005',
    1
  ),
  (
    '20000000-0000-4000-8000-000000000002',
    '10000000-0000-4000-8000-000000000001',
    1
  ),
  (
    '20000000-0000-4000-8000-000000000002',
    '10000000-0000-4000-8000-000000000002',
    1
  ),
  (
    '20000000-0000-4000-8000-000000000002',
    '10000000-0000-4000-8000-000000000006',
    1
  ),
  (
    '20000000-0000-4000-8000-000000000002',
    '10000000-0000-4000-8000-000000000003',
    -1
  ),
  (
    '20000000-0000-4000-8000-000000000002',
    '10000000-0000-4000-8000-000000000004',
    -1
  );

select is(
  (
    select role::text
    from public.group_members
    where group_id = '00000000-0000-4000-8000-000000000001'
      and user_id = '10000000-0000-4000-8000-000000000001'
  ),
  'admin',
  'the configured administrator receives the admin role'
);

set local role authenticated;
select set_config(
  'request.jwt.claims',
  jsonb_build_object(
    'sub',
    '10000000-0000-4000-8000-000000000001',
    'email',
    'fixture.admin@theodo.com',
    'app_metadata',
    jsonb_build_object('provider', 'google')
  )::text,
  true
);

select is(
  public.get_ballot_metrics()->'crowdFavourite'->>'name',
  'Favourite',
  'the highest approval item is selected'
);
select is(
  public.get_ballot_metrics()->'mostDebated'->>'name',
  'Debated',
  'the closest qualifying vote split is selected'
);
select is(
  (public.get_ballot_metrics()->'turnout'->>'participantCount')::integer,
  6,
  'turnout remembers every member who voted'
);
select is(
  (public.get_ballot_metrics()->'freshSuggestions'->>'currentCount')::integer,
  3,
  'new suggestions are counted for the active cycle'
);

select public.start_next_cycle(
  '00000000-0000-4000-8000-000000000001',
  array['20000000-0000-4000-8000-000000000003']::uuid[]
);

set local role postgres;

select is(
  (select count(*)::integer from public.ballot_cycles),
  1,
  'starting the next cycle creates one cycle snapshot'
);
select is(
  (select count(*)::integer from public.ballot_cycle_items),
  3,
  'the snapshot preserves every ranked item'
);
select is(
  (
    select participant_count
    from public.ballot_cycles
    order by ended_at desc
    limit 1
  ),
  6,
  'the snapshot preserves completed-cycle turnout'
);
select is(
  (select count(*)::integer from public.votes),
  0,
  'starting the next cycle clears current votes'
);
select is(
  (
    select count(*)::integer
    from public.items
    where id = '20000000-0000-4000-8000-000000000003'
  ),
  0,
  'accepted one-off items are still removed'
);
select is(
  (
    select cycle_suggestion_count
    from public.groups
    where id = '00000000-0000-4000-8000-000000000001'
  ),
  0,
  'starting the next cycle resets its suggestion count'
);

insert into public.votes (item_id, user_id, value)
values
  (
    '20000000-0000-4000-8000-000000000002',
    '10000000-0000-4000-8000-000000000001',
    1
  ),
  (
    '20000000-0000-4000-8000-000000000002',
    '10000000-0000-4000-8000-000000000002',
    1
  ),
  (
    '20000000-0000-4000-8000-000000000002',
    '10000000-0000-4000-8000-000000000003',
    1
  ),
  (
    '20000000-0000-4000-8000-000000000002',
    '10000000-0000-4000-8000-000000000004',
    1
  ),
  (
    '20000000-0000-4000-8000-000000000002',
    '10000000-0000-4000-8000-000000000005',
    1
  );

set local role authenticated;

select is(
  public.get_ballot_metrics()->'biggestMover'->>'name',
  'Debated',
  'current ranks are compared with the latest completed cycle'
);
select is(
  (
    public.get_ballot_metrics()
      ->'freshSuggestions'
      ->>'previousCount'
  )::integer,
  3,
  'the previous cycle suggestion count is available'
);
select is(
  (
    public.get_ballot_metrics()
      ->'freshSuggestions'
      ->>'currentCount'
  )::integer,
  0,
  'the active cycle starts with no suggestions'
);
select is(
  (
    public.get_ballot_metrics()
      ->'turnout'
      ->>'participantCount'
  )::integer,
  5,
  'new-cycle turnout is tracked independently'
);
select is(
  (public.get_ballot_metrics()->'turnout'->>'deltaPoints')::integer,
  -17,
  'turnout is compared with the previous completed cycle'
);
select throws_ok(
  'select count(*) from public.ballot_cycles',
  '42501',
  'permission denied for table ballot_cycles',
  'raw cycle history is hidden behind the aggregate function'
);

select * from finish();

rollback;
