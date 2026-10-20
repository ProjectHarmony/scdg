-- Support Community-scoped Challonge tournaments and make judge assignments readable.

alter table public.scoring_tournaments
add column if not exists challonge_community_id text;

create index if not exists scoring_tournaments_community_idx
on public.scoring_tournaments (challonge_community_id)
where challonge_community_id is not null;

create or replace function public.ensure_scoring_judge_membership()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.assigned_judge_id is not null then
    insert into public.scoring_memberships (tournament_id, user_id, role)
    values (new.tournament_id, new.assigned_judge_id, 'judge')
    on conflict (tournament_id, user_id) do nothing;
  end if;
  return new;
end;
$$;

revoke all on function public.ensure_scoring_judge_membership() from public;

drop trigger if exists scoring_matches_ensure_judge_membership on public.scoring_matches;
create trigger scoring_matches_ensure_judge_membership
after insert or update of assigned_judge_id on public.scoring_matches
for each row execute function public.ensure_scoring_judge_membership();

insert into public.scoring_memberships (tournament_id, user_id, role)
select distinct tournament_id, assigned_judge_id, 'judge'
from public.scoring_matches
where assigned_judge_id is not null
on conflict (tournament_id, user_id) do nothing;
