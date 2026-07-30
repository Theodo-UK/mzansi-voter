alter table public.groups
add column cycle_started_at timestamptz not null default now();

update public.groups
set cycle_started_at = (
  (next_order_date - 7)::timestamp
  at time zone 'Africa/Johannesburg'
);

alter table public.groups
add column cycle_suggestion_count integer not null default 0
check (cycle_suggestion_count >= 0);

update public.groups as target
set cycle_suggestion_count = (
  select count(*)::integer
  from public.items
  where items.group_id = target.id
    and items.created_at >= target.cycle_started_at
);

create table public.group_member_activity (
  group_id uuid not null,
  user_id uuid not null,
  last_voted_at timestamptz not null,
  primary key (group_id, user_id),
  foreign key (group_id, user_id)
    references public.group_members (group_id, user_id)
    on delete cascade
);

insert into public.group_member_activity (group_id, user_id, last_voted_at)
select
  items.group_id,
  votes.user_id,
  max(votes.updated_at)
from public.votes
join public.items on items.id = votes.item_id
group by items.group_id, votes.user_id;

create table public.ballot_cycles (
  id uuid primary key default gen_random_uuid(),
  group_id uuid not null references public.groups (id) on delete cascade,
  started_at timestamptz not null,
  ended_at timestamptz not null,
  member_count integer not null check (member_count >= 0),
  participant_count integer not null
    check (participant_count >= 0 and participant_count <= member_count),
  suggestion_count integer not null check (suggestion_count >= 0),
  check (ended_at >= started_at)
);

create index ballot_cycles_group_ended_at_idx
on public.ballot_cycles (group_id, ended_at desc);

create table public.ballot_cycle_items (
  cycle_id uuid not null
    references public.ballot_cycles (id) on delete cascade,
  item_id uuid not null,
  name text not null,
  rank_position integer not null check (rank_position > 0),
  up_votes integer not null check (up_votes >= 0),
  down_votes integer not null check (down_votes >= 0),
  primary key (cycle_id, item_id)
);

alter table public.group_member_activity enable row level security;
alter table public.ballot_cycles enable row level security;
alter table public.ballot_cycle_items enable row level security;

create or replace function public.record_ballot_vote_activity()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  target_group_id uuid;
begin
  select group_id
  into target_group_id
  from public.items
  where id = new.item_id;

  insert into public.group_member_activity (
    group_id,
    user_id,
    last_voted_at
  )
  values (target_group_id, new.user_id, statement_timestamp())
  on conflict (group_id, user_id)
  do update set last_voted_at = excluded.last_voted_at;

  return new;
end;
$$;

create trigger votes_record_ballot_activity
after insert or update on public.votes
for each row execute procedure public.record_ballot_vote_activity();

revoke execute on function public.record_ballot_vote_activity()
from anon, authenticated, public;

create or replace function public.record_ballot_suggestion()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  update public.groups
  set cycle_suggestion_count = cycle_suggestion_count + 1
  where id = new.group_id;

  return new;
end;
$$;

create trigger items_record_ballot_suggestion
after insert on public.items
for each row execute procedure public.record_ballot_suggestion();

revoke execute on function public.record_ballot_suggestion()
from anon, authenticated, public;

create or replace function public.start_next_cycle(
  target_group_id uuid,
  accepted_item_ids uuid[]
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  snapshot_cycle_id uuid;
  cycle_started_at timestamptz;
  cycle_ended_at timestamptz := statement_timestamp();
  cycle_suggestion_count integer;
begin
  if not public.is_group_admin(target_group_id) then
    raise exception 'Only group admins can start a new shopping cycle.';
  end if;

  select groups.cycle_started_at, groups.cycle_suggestion_count
  into cycle_started_at, cycle_suggestion_count
  from public.groups
  where id = target_group_id
  for update;

  insert into public.ballot_cycles (
    group_id,
    started_at,
    ended_at,
    member_count,
    participant_count,
    suggestion_count
  )
  values (
    target_group_id,
    cycle_started_at,
    cycle_ended_at,
    (
      select count(*)::integer
      from public.group_members
      where group_id = target_group_id
    ),
    (
      select count(*)::integer
      from public.group_member_activity
      where group_id = target_group_id
        and last_voted_at >= cycle_started_at
        and last_voted_at <= cycle_ended_at
    ),
    cycle_suggestion_count
  )
  returning id into snapshot_cycle_id;

  with item_totals as (
    select
      items.id,
      items.name,
      items.locked,
      items.created_at,
      count(votes.item_id) filter (where votes.value = 1)::integer
        as up_votes,
      count(votes.item_id) filter (where votes.value = -1)::integer
        as down_votes
    from public.items
    left join public.votes on votes.item_id = items.id
    where items.group_id = target_group_id
      and items.skipped = false
    group by items.id
  ),
  ranked_items as (
    select
      *,
      (
        row_number() over (
          order by
            locked desc,
            (up_votes - down_votes) desc,
            created_at,
            id
        )
      )::integer as rank_position
    from item_totals
  )
  insert into public.ballot_cycle_items (
    cycle_id,
    item_id,
    name,
    rank_position,
    up_votes,
    down_votes
  )
  select
    snapshot_cycle_id,
    id,
    name,
    rank_position,
    up_votes,
    down_votes
  from ranked_items;

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

  update public.groups
  set
    cycle_started_at = cycle_ended_at,
    cycle_suggestion_count = 0
  where id = target_group_id;
end;
$$;

create or replace function public.get_ballot_metrics()
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  target_group_id uuid;
begin
  select group_members.group_id
  into target_group_id
  from public.group_members
  where user_id = auth.uid()
  order by created_at
  limit 1;

  if target_group_id is null
     or not public.is_group_member(target_group_id) then
    raise exception 'Only group members can view ballot metrics.';
  end if;

  return (
    with current_group as (
      select
        groups.name,
        groups.cycle_started_at,
        groups.cycle_suggestion_count
      from public.groups
      where groups.id = target_group_id
    ),
    item_totals as (
      select
        items.id as item_id,
        items.name,
        items.locked,
        items.created_at,
        count(votes.item_id) filter (where votes.value = 1)::integer
          as up_votes,
        count(votes.item_id) filter (where votes.value = -1)::integer
          as down_votes
      from public.items
      left join public.votes on votes.item_id = items.id
      where items.group_id = target_group_id
        and items.skipped = false
      group by items.id
    ),
    current_items as (
      select
        *,
        (
          row_number() over (
            order by
              locked desc,
              (up_votes - down_votes) desc,
              created_at,
              item_id
          )
        )::integer as rank_position
      from item_totals
    ),
    previous_cycle as (
      select *
      from public.ballot_cycles
      where group_id = target_group_id
      order by ended_at desc
      limit 1
    ),
    previous_items as (
      select ballot_cycle_items.*
      from public.ballot_cycle_items
      where cycle_id = (select id from previous_cycle)
    ),
    favourite as (
      select
        current_items.*,
        previous_items.up_votes as previous_up_votes,
        previous_items.down_votes as previous_down_votes
      from current_items
      left join previous_items using (item_id)
      where current_items.locked = false
        and current_items.up_votes + current_items.down_votes >= 5
      order by
        current_items.up_votes::numeric
          / (current_items.up_votes + current_items.down_votes) desc,
        current_items.up_votes + current_items.down_votes desc,
        current_items.rank_position
      limit 1
    ),
    debated as (
      select
        current_items.*,
        previous_items.up_votes as previous_up_votes,
        previous_items.down_votes as previous_down_votes
      from current_items
      left join previous_items using (item_id)
      where current_items.locked = false
        and current_items.up_votes + current_items.down_votes >= 5
      order by
        abs(current_items.up_votes - current_items.down_votes),
        current_items.up_votes + current_items.down_votes desc,
        current_items.rank_position
      limit 1
    ),
    mover as (
      select
        current_items.item_id,
        current_items.name,
        current_items.rank_position as current_rank,
        previous_items.rank_position as previous_rank
      from current_items
      join previous_items using (item_id)
      where current_items.locked = false
        and previous_items.rank_position > current_items.rank_position
      order by
        previous_items.rank_position - current_items.rank_position desc,
        current_items.rank_position
      limit 1
    ),
    campaign as (
      select
        current_items.*,
        previous_items.up_votes as previous_up_votes,
        previous_items.down_votes as previous_down_votes
      from current_items
      left join previous_items using (item_id)
      where current_items.locked = false
        and current_items.up_votes + current_items.down_votes > 0
      order by
        current_items.up_votes - current_items.down_votes,
        current_items.down_votes desc,
        current_items.rank_position desc
      limit 1
    ),
    turnout as (
      select
        count(group_members.user_id)::integer as member_count,
        count(group_members.user_id) filter (
          where group_member_activity.last_voted_at
            >= current_group.cycle_started_at
        )::integer as participant_count
      from current_group
      left join public.group_members
        on group_members.group_id = target_group_id
      left join public.group_member_activity
        on group_member_activity.group_id = group_members.group_id
        and group_member_activity.user_id = group_members.user_id
      group by current_group.cycle_started_at
    )
    select jsonb_build_object(
      'groupName',
      (select name from current_group),
      'period',
      jsonb_build_object(
        'currentStartedAt',
        (select cycle_started_at from current_group),
        'previousStartedAt',
        (select started_at from previous_cycle),
        'previousEndedAt',
        (select ended_at from previous_cycle)
      ),
      'crowdFavourite',
      (
        select jsonb_build_object(
          'itemId',
          favourite.item_id,
          'name',
          favourite.name,
          'upVotes',
          favourite.up_votes,
          'downVotes',
          favourite.down_votes,
          'approvalPercent',
          round(
            100.0 * favourite.up_votes
              / (favourite.up_votes + favourite.down_votes)
          )::integer,
          'approvalDeltaPoints',
          case
            when favourite.previous_up_votes is null
              or favourite.previous_up_votes
                + favourite.previous_down_votes = 0 then null
            else
              round(
                100.0 * favourite.up_votes
                  / (favourite.up_votes + favourite.down_votes)
              )::integer
              - round(
                100.0 * favourite.previous_up_votes
                  / (
                    favourite.previous_up_votes
                    + favourite.previous_down_votes
                  )
              )::integer
          end
        )
        from favourite
      ),
      'mostDebated',
      (
        select jsonb_build_object(
          'itemId',
          debated.item_id,
          'name',
          debated.name,
          'upVotes',
          debated.up_votes,
          'downVotes',
          debated.down_votes,
          'voteDelta',
          case
            when debated.previous_up_votes is null then null
            else
              debated.up_votes + debated.down_votes
              - debated.previous_up_votes - debated.previous_down_votes
          end
        )
        from debated
      ),
      'biggestMover',
      (
        select jsonb_build_object(
          'itemId',
          mover.item_id,
          'name',
          mover.name,
          'previousRank',
          mover.previous_rank,
          'currentRank',
          mover.current_rank,
          'gain',
          mover.previous_rank - mover.current_rank
        )
        from mover
      ),
      'needsCampaign',
      (
        select jsonb_build_object(
          'itemId',
          campaign.item_id,
          'name',
          campaign.name,
          'upVotes',
          campaign.up_votes,
          'downVotes',
          campaign.down_votes,
          'netScore',
          campaign.up_votes - campaign.down_votes,
          'netDelta',
          case
            when campaign.previous_up_votes is null then null
            else
              campaign.up_votes - campaign.down_votes
              - campaign.previous_up_votes + campaign.previous_down_votes
          end
        )
        from campaign
      ),
      'turnout',
      (
        select jsonb_build_object(
          'participantCount',
          turnout.participant_count,
          'memberCount',
          turnout.member_count,
          'percentage',
          case
            when turnout.member_count = 0 then 0
            else round(
              100.0 * turnout.participant_count / turnout.member_count
            )::integer
          end,
          'deltaPoints',
          case
            when (select member_count from previous_cycle) is null
              or (select member_count from previous_cycle) = 0 then null
            else
              case
                when turnout.member_count = 0 then 0
                else round(
                  100.0 * turnout.participant_count / turnout.member_count
                )::integer
              end
              - round(
                100.0 * (select participant_count from previous_cycle)
                  / (select member_count from previous_cycle)
              )::integer
          end
        )
        from turnout
      ),
      'freshSuggestions',
      jsonb_build_object(
        'currentCount',
        (select cycle_suggestion_count from current_group),
        'previousCount',
        (select suggestion_count from previous_cycle),
        'delta',
        case
          when (select suggestion_count from previous_cycle) is null then null
          else
            (select cycle_suggestion_count from current_group)
            - (select suggestion_count from previous_cycle)
        end
      )
    )
  );
end;
$$;

revoke execute on function public.get_ballot_metrics()
from anon, public;
grant execute on function public.get_ballot_metrics()
to authenticated;
