-- A relaunch is not a scoring action under the S-CDG house rules.

update public.scoring_tournaments
set rules = jsonb_set(
  rules,
  '{finish_points}',
  coalesce(rules -> 'finish_points', '{}'::jsonb) - 'draw'
)
where coalesce(rules -> 'finish_points', '{}'::jsonb) ? 'draw';

update public.scoring_entries e
set display_name = case e.challonge_participant_id
  when -101 then 'Player Alpha'
  when -102 then 'Player Bravo'
  when -103 then 'Player Charlie'
  when -104 then 'Player Delta'
  when -105 then 'Player Echo'
  when -106 then 'Player Foxtrot'
end
from public.scoring_tournaments t
where t.id = e.tournament_id
  and t.name = 'S-CDG Scoring Demo'
  and e.challonge_participant_id between -106 and -101;

create or replace function public.reject_relaunch_scoring_event()
returns trigger
language plpgsql
as $$
begin
  if new.finish_type = 'draw' then
    raise exception 'Relaunches are not scoring events.';
  end if;
  return new;
end;
$$;

drop trigger if exists scoring_events_reject_relaunch on public.scoring_match_events;
create trigger scoring_events_reject_relaunch
before insert or update of finish_type on public.scoring_match_events
for each row execute function public.reject_relaunch_scoring_event();
