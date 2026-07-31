create or replace function public.get_ballot_metrics_with_history()
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  metrics jsonb := public.get_ballot_metrics();
  target_group_id uuid;
  mover_item_id uuid := (metrics #>> '{biggestMover,itemId}')::uuid;
  mover_history jsonb;
begin
  if mover_item_id is null then
    return metrics;
  end if;

  select group_members.group_id
  into target_group_id
  from public.group_members
  where user_id = auth.uid()
  order by created_at
  limit 1;

  select jsonb_agg(
    jsonb_build_object(
      'startedAt',
      rank_history.started_at,
      'rank',
      rank_history.rank_position
    )
    order by rank_history.started_at
  )
  into mover_history
  from (
    select
      recent_cycles.started_at,
      ballot_cycle_items.rank_position
    from (
      select ballot_cycles.id, ballot_cycles.started_at
      from public.ballot_cycles
      where ballot_cycles.group_id = target_group_id
      order by ballot_cycles.ended_at desc
      limit 5
    ) as recent_cycles
    join public.ballot_cycle_items
      on ballot_cycle_items.cycle_id = recent_cycles.id
      and ballot_cycle_items.item_id = mover_item_id

    union all

    select
      (metrics #>> '{period,currentStartedAt}')::timestamptz,
      (metrics #>> '{biggestMover,currentRank}')::integer
  ) as rank_history;

  return jsonb_set(
    metrics,
    '{biggestMover,rankHistory}',
    coalesce(mover_history, '[]'::jsonb)
  );
end;
$$;

revoke execute on function public.get_ballot_metrics_with_history()
from anon, public;
grant execute on function public.get_ballot_metrics_with_history()
to authenticated;
