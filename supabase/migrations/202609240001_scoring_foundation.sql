-- Beyblade X scoring foundation. Existing players and match_results stay untouched.

create extension if not exists pgcrypto;

create table public.scoring_tournaments (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users(id) on delete cascade,
  challonge_tournament_id bigint,
  challonge_scope text not null default 'user' check (challonge_scope in ('user', 'community', 'application')),
  name text not null,
  current_round integer not null default 0 check (current_round >= 0),
  rules jsonb not null default '{"finish_points":{"xtreme":3,"burst":2,"over":2,"spin":1},"bye_counts_for_tiebreakers":true}'::jsonb,
  status text not null default 'draft' check (status in ('draft', 'active', 'complete', 'archived')),
  feature_enabled boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (owner_id, challonge_tournament_id)
);

create table public.scoring_stages (
  id uuid primary key default gen_random_uuid(),
  tournament_id uuid not null references public.scoring_tournaments(id) on delete cascade,
  stage_no integer not null check (stage_no > 0),
  type text not null check (type in ('swiss', 'top_cut')),
  target_score integer not null check (target_score > 0),
  num_rounds integer check (num_rounds is null or num_rounds > 0),
  challonge_tournament_id bigint,
  status text not null default 'pending' check (status in ('pending', 'active', 'complete')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (tournament_id, stage_no),
  unique (id, tournament_id)
);

create table public.scoring_people (
  id uuid primary key default gen_random_uuid(),
  tournament_id uuid not null references public.scoring_tournaments(id) on delete cascade,
  display_name text not null,
  created_at timestamptz not null default now(),
  unique (id, tournament_id)
);

create table public.scoring_entries (
  id uuid primary key default gen_random_uuid(),
  tournament_id uuid not null references public.scoring_tournaments(id) on delete cascade,
  person_id uuid,
  challonge_participant_id bigint,
  display_name text not null,
  entry_number integer not null default 1 check (entry_number > 0),
  seed integer,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (tournament_id, challonge_participant_id),
  unique (tournament_id, person_id, entry_number),
  unique (id, tournament_id),
  foreign key (person_id, tournament_id) references public.scoring_people(id, tournament_id) on delete restrict
);

create table public.scoring_memberships (
  tournament_id uuid not null references public.scoring_tournaments(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  role text not null check (role in ('organizer', 'head_judge', 'judge')),
  created_at timestamptz not null default now(),
  primary key (tournament_id, user_id)
);

create table public.scoring_matches (
  id uuid primary key default gen_random_uuid(),
  tournament_id uuid not null references public.scoring_tournaments(id) on delete cascade,
  stage_id uuid not null,
  challonge_match_id bigint,
  round integer not null check (round > 0),
  bracket_round integer,
  table_no text,
  entry_a_id uuid,
  entry_b_id uuid,
  assigned_judge_id uuid references auth.users(id) on delete set null,
  is_bye boolean not null default false,
  bye_counts_for_tiebreakers boolean not null default true,
  score_a integer not null default 0 check (score_a >= 0),
  score_b integer not null default 0 check (score_b >= 0),
  status text not null default 'pending' check (status in ('pending', 'live', 'complete', 'synced', 'sync_failed')),
  winner_entry_id uuid,
  started_at timestamptz,
  ended_at timestamptz,
  synced_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint scoring_match_has_player check (entry_a_id is not null or entry_b_id is not null),
  constraint scoring_match_distinct_players check (entry_a_id is null or entry_b_id is null or entry_a_id <> entry_b_id),
  constraint scoring_match_bye_shape check (
    (is_bye and ((entry_a_id is null) <> (entry_b_id is null)))
    or (not is_bye and entry_a_id is not null and entry_b_id is not null)
  ),
  foreign key (stage_id, tournament_id) references public.scoring_stages(id, tournament_id) on delete cascade,
  foreign key (entry_a_id, tournament_id) references public.scoring_entries(id, tournament_id) on delete restrict,
  foreign key (entry_b_id, tournament_id) references public.scoring_entries(id, tournament_id) on delete restrict,
  foreign key (winner_entry_id, tournament_id) references public.scoring_entries(id, tournament_id) on delete restrict,
  unique (tournament_id, challonge_match_id)
);

create table public.scoring_match_events (
  id uuid primary key default gen_random_uuid(),
  match_id uuid not null references public.scoring_matches(id) on delete cascade,
  scoring_entry_id uuid references public.scoring_entries(id) on delete restrict,
  finish_type text not null check (finish_type in ('xtreme', 'burst', 'over', 'spin', 'bye')),
  points integer not null check (points >= 0),
  sequence_no integer not null check (sequence_no > 0),
  idempotency_key uuid not null default gen_random_uuid(),
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  voided boolean not null default false,
  voided_by uuid references auth.users(id) on delete set null,
  voided_at timestamptz,
  void_reason text,
  constraint scoring_event_player_shape check (scoring_entry_id is not null),
  unique (match_id, sequence_no),
  unique (match_id, idempotency_key)
);

create table public.scoring_cut_entries (
  id uuid primary key default gen_random_uuid(),
  stage_id uuid not null references public.scoring_stages(id) on delete cascade,
  entry_id uuid not null references public.scoring_entries(id) on delete cascade,
  swiss_rank integer not null check (swiss_rank > 0),
  seed integer not null check (seed > 0),
  status text not null default 'qualified' check (status in ('qualified', 'replaced', 'declined')),
  created_at timestamptz not null default now(),
  unique (stage_id, entry_id),
  unique (stage_id, seed)
);

create table public.scoring_sync_log (
  id uuid primary key default gen_random_uuid(),
  match_id uuid references public.scoring_matches(id) on delete cascade,
  operation text not null,
  request_payload jsonb,
  response_status integer,
  response_body jsonb,
  attempt_no integer not null default 1 check (attempt_no > 0),
  created_at timestamptz not null default now()
);

create index scoring_stages_tournament_idx on public.scoring_stages (tournament_id, status);
create index scoring_people_tournament_idx on public.scoring_people (tournament_id);
create index scoring_entries_tournament_idx on public.scoring_entries (tournament_id, is_active);
create index scoring_entries_person_idx on public.scoring_entries (person_id) where person_id is not null;
create index scoring_memberships_user_idx on public.scoring_memberships (user_id, tournament_id);
create index scoring_matches_round_idx on public.scoring_matches (tournament_id, stage_id, round, status);
create index scoring_matches_judge_idx on public.scoring_matches (assigned_judge_id, status) where assigned_judge_id is not null;
create index scoring_events_match_idx on public.scoring_match_events (match_id, sequence_no) where not voided;
create index scoring_sync_log_match_idx on public.scoring_sync_log (match_id, created_at desc);

create or replace function public.set_scoring_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger scoring_tournaments_updated_at before update on public.scoring_tournaments
for each row execute function public.set_scoring_updated_at();
create trigger scoring_stages_updated_at before update on public.scoring_stages
for each row execute function public.set_scoring_updated_at();
create trigger scoring_entries_updated_at before update on public.scoring_entries
for each row execute function public.set_scoring_updated_at();
create trigger scoring_matches_updated_at before update on public.scoring_matches
for each row execute function public.set_scoring_updated_at();

create or replace function public.can_access_scoring_tournament(p_tournament_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select auth.uid() is not null and (
    public.is_admin()
    or exists (
      select 1 from public.scoring_tournaments t
      where t.id = p_tournament_id and t.owner_id = auth.uid()
    )
    or exists (
      select 1 from public.scoring_memberships m
      where m.tournament_id = p_tournament_id and m.user_id = auth.uid()
    )
  );
$$;

create or replace function public.can_manage_scoring_tournament(p_tournament_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select auth.uid() is not null and (
    public.is_admin()
    or exists (
      select 1 from public.scoring_tournaments t
      where t.id = p_tournament_id and t.owner_id = auth.uid()
    )
    or exists (
      select 1 from public.scoring_memberships m
      where m.tournament_id = p_tournament_id
        and m.user_id = auth.uid()
        and m.role in ('organizer', 'head_judge')
    )
  );
$$;

create or replace function public.can_score_scoring_match(p_match_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.scoring_matches m
    where m.id = p_match_id
      and (
        public.can_manage_scoring_tournament(m.tournament_id)
        or m.assigned_judge_id = auth.uid()
      )
  );
$$;

create or replace function public.record_scoring_event(
  p_match_id uuid,
  p_finish_type text,
  p_scoring_entry_id uuid default null,
  p_idempotency_key uuid default gen_random_uuid()
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_match public.scoring_matches%rowtype;
  v_rules jsonb;
  v_target integer;
  v_points integer;
  v_sequence integer;
  v_score_a integer;
  v_score_b integer;
  v_winner uuid;
begin
  select * into v_match from public.scoring_matches where id = p_match_id for update;
  if not found then raise exception 'Match not found.'; end if;
  if not public.can_score_scoring_match(p_match_id) then raise exception 'Not authorized to score this match.'; end if;

  if exists (
    select 1 from public.scoring_match_events
    where match_id = p_match_id and idempotency_key = p_idempotency_key
  ) then
    return to_jsonb(v_match);
  end if;

  if v_match.is_bye then raise exception 'Bye matches are completed automatically.'; end if;
  if v_match.status in ('complete', 'synced') then raise exception 'Match is already complete.'; end if;
  if p_finish_type not in ('xtreme', 'burst', 'over', 'spin') then
    raise exception 'Unknown finish type.';
  end if;
  if p_scoring_entry_id is null or p_scoring_entry_id not in (v_match.entry_a_id, v_match.entry_b_id) then
    raise exception 'Scoring player does not belong to this match.';
  end if;

  select t.rules, s.target_score into v_rules, v_target
  from public.scoring_tournaments t
  join public.scoring_stages s on s.tournament_id = t.id
  where t.id = v_match.tournament_id and s.id = v_match.stage_id;

  v_points := coalesce(
    (v_rules -> 'finish_points' ->> p_finish_type)::integer,
    case p_finish_type when 'xtreme' then 3 when 'burst' then 2 when 'over' then 2 when 'spin' then 1 else 0 end
  );
  if v_points < 0 then raise exception 'Finish points cannot be negative.'; end if;

  select coalesce(max(sequence_no), 0) + 1 into v_sequence
  from public.scoring_match_events where match_id = p_match_id;

  insert into public.scoring_match_events (
    match_id, scoring_entry_id, finish_type, points, sequence_no, idempotency_key, created_by
  ) values (
    p_match_id, p_scoring_entry_id, p_finish_type, v_points, v_sequence, p_idempotency_key, auth.uid()
  );

  select
    coalesce(sum(points) filter (where scoring_entry_id = v_match.entry_a_id and not voided), 0),
    coalesce(sum(points) filter (where scoring_entry_id = v_match.entry_b_id and not voided), 0)
  into v_score_a, v_score_b
  from public.scoring_match_events where match_id = p_match_id;

  v_winner := case
    when v_score_a >= v_target then v_match.entry_a_id
    when v_score_b >= v_target then v_match.entry_b_id
    else null
  end;

  update public.scoring_matches
  set score_a = v_score_a,
      score_b = v_score_b,
      winner_entry_id = v_winner,
      status = case when v_winner is null then 'live' else 'complete' end,
      started_at = coalesce(started_at, now()),
      ended_at = case when v_winner is null then null else now() end
  where id = p_match_id
  returning * into v_match;

  return to_jsonb(v_match);
end;
$$;

create or replace function public.undo_last_scoring_event(
  p_match_id uuid,
  p_reason text default 'Judge correction'
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_match public.scoring_matches%rowtype;
  v_event_id uuid;
  v_score_a integer;
  v_score_b integer;
  v_has_events boolean;
begin
  select * into v_match from public.scoring_matches where id = p_match_id for update;
  if not found then raise exception 'Match not found.'; end if;
  if not public.can_score_scoring_match(p_match_id) then raise exception 'Not authorized to edit this match.'; end if;
  if v_match.status = 'synced' then raise exception 'Synced matches must be reopened by a head judge.'; end if;
  if v_match.is_bye then raise exception 'Bye matches cannot be edited by judges.'; end if;

  select id into v_event_id
  from public.scoring_match_events
  where match_id = p_match_id and not voided
  order by sequence_no desc
  limit 1;
  if v_event_id is null then raise exception 'No scoring event to undo.'; end if;

  update public.scoring_match_events
  set voided = true, voided_by = auth.uid(), voided_at = now(), void_reason = p_reason
  where id = v_event_id;

  select
    coalesce(sum(points) filter (where scoring_entry_id = v_match.entry_a_id and not voided), 0),
    coalesce(sum(points) filter (where scoring_entry_id = v_match.entry_b_id and not voided), 0),
    exists(select 1 from public.scoring_match_events e where e.match_id = p_match_id and not e.voided)
  into v_score_a, v_score_b, v_has_events
  from public.scoring_match_events where match_id = p_match_id;

  update public.scoring_matches
  set score_a = v_score_a,
      score_b = v_score_b,
      winner_entry_id = null,
      status = case when v_has_events then 'live' else 'pending' end,
      ended_at = null
  where id = p_match_id
  returning * into v_match;

  return to_jsonb(v_match);
end;
$$;

create or replace function public.complete_scoring_bye(p_match_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_match public.scoring_matches%rowtype;
  v_rules jsonb;
  v_target integer;
  v_bye_score integer;
  v_winner uuid;
begin
  select * into v_match from public.scoring_matches where id = p_match_id for update;
  if not found then raise exception 'Match not found.'; end if;
  if not public.can_manage_scoring_tournament(v_match.tournament_id) then raise exception 'Not authorized.'; end if;
  if not v_match.is_bye then raise exception 'Match is not a bye.'; end if;
  if v_match.status in ('complete', 'synced') then return to_jsonb(v_match); end if;

  select t.rules, s.target_score into v_rules, v_target
  from public.scoring_tournaments t
  join public.scoring_stages s on s.tournament_id = t.id
  where t.id = v_match.tournament_id and s.id = v_match.stage_id;

  v_bye_score := coalesce((v_rules ->> 'bye_score')::integer, v_target);
  v_winner := coalesce(v_match.entry_a_id, v_match.entry_b_id);

  insert into public.scoring_match_events (
    match_id, scoring_entry_id, finish_type, points, sequence_no, created_by
  ) values (p_match_id, v_winner, 'bye', v_bye_score, 1, auth.uid());

  update public.scoring_matches
  set score_a = case when entry_a_id = v_winner then v_bye_score else 0 end,
      score_b = case when entry_b_id = v_winner then v_bye_score else 0 end,
      winner_entry_id = v_winner,
      bye_counts_for_tiebreakers = coalesce((v_rules ->> 'bye_counts_for_tiebreakers')::boolean, true),
      status = 'complete',
      started_at = coalesce(started_at, now()),
      ended_at = now()
  where id = p_match_id
  returning * into v_match;

  return to_jsonb(v_match);
end;
$$;

alter table public.scoring_tournaments enable row level security;
alter table public.scoring_stages enable row level security;
alter table public.scoring_people enable row level security;
alter table public.scoring_entries enable row level security;
alter table public.scoring_memberships enable row level security;
alter table public.scoring_matches enable row level security;
alter table public.scoring_match_events enable row level security;
alter table public.scoring_cut_entries enable row level security;
alter table public.scoring_sync_log enable row level security;

create policy "scoring tournament create" on public.scoring_tournaments
for insert to authenticated with check (owner_id = auth.uid() or public.is_admin());
create policy "scoring tournament read" on public.scoring_tournaments
for select to authenticated using (public.can_access_scoring_tournament(id));
create policy "scoring tournament manage" on public.scoring_tournaments
for update to authenticated using (public.can_manage_scoring_tournament(id)) with check (public.can_manage_scoring_tournament(id));
create policy "scoring tournament delete" on public.scoring_tournaments
for delete to authenticated using (public.can_manage_scoring_tournament(id));

create policy "scoring stages read" on public.scoring_stages
for select to authenticated using (public.can_access_scoring_tournament(tournament_id));
create policy "scoring stages manage" on public.scoring_stages
for all to authenticated using (public.can_manage_scoring_tournament(tournament_id)) with check (public.can_manage_scoring_tournament(tournament_id));

create policy "scoring people read" on public.scoring_people
for select to authenticated using (public.can_access_scoring_tournament(tournament_id));
create policy "scoring people manage" on public.scoring_people
for all to authenticated using (public.can_manage_scoring_tournament(tournament_id)) with check (public.can_manage_scoring_tournament(tournament_id));

create policy "scoring entries read" on public.scoring_entries
for select to authenticated using (public.can_access_scoring_tournament(tournament_id));
create policy "scoring entries manage" on public.scoring_entries
for all to authenticated using (public.can_manage_scoring_tournament(tournament_id)) with check (public.can_manage_scoring_tournament(tournament_id));

create policy "scoring memberships read" on public.scoring_memberships
for select to authenticated using (public.can_access_scoring_tournament(tournament_id));
create policy "scoring memberships manage" on public.scoring_memberships
for all to authenticated using (public.can_manage_scoring_tournament(tournament_id)) with check (public.can_manage_scoring_tournament(tournament_id));

create policy "scoring matches read" on public.scoring_matches
for select to authenticated using (public.can_access_scoring_tournament(tournament_id));
create policy "scoring matches manage" on public.scoring_matches
for all to authenticated using (public.can_manage_scoring_tournament(tournament_id)) with check (public.can_manage_scoring_tournament(tournament_id));

create policy "scoring events read" on public.scoring_match_events
for select to authenticated using (
  exists (
    select 1 from public.scoring_matches m
    where m.id = match_id and public.can_access_scoring_tournament(m.tournament_id)
  )
);

create policy "scoring cut entries read" on public.scoring_cut_entries
for select to authenticated using (
  exists (
    select 1 from public.scoring_stages s
    where s.id = stage_id and public.can_access_scoring_tournament(s.tournament_id)
  )
);
create policy "scoring cut entries manage" on public.scoring_cut_entries
for all to authenticated using (
  exists (
    select 1 from public.scoring_stages s
    where s.id = stage_id and public.can_manage_scoring_tournament(s.tournament_id)
  )
) with check (
  exists (
    select 1 from public.scoring_stages s
    where s.id = stage_id and public.can_manage_scoring_tournament(s.tournament_id)
  )
);

create policy "scoring sync log read" on public.scoring_sync_log
for select to authenticated using (
  match_id is null or exists (
    select 1 from public.scoring_matches m
    where m.id = match_id and public.can_manage_scoring_tournament(m.tournament_id)
  )
);

revoke all on function public.record_scoring_event(uuid, text, uuid, uuid) from public;
revoke all on function public.undo_last_scoring_event(uuid, text) from public;
revoke all on function public.complete_scoring_bye(uuid) from public;
grant execute on function public.record_scoring_event(uuid, text, uuid, uuid) to authenticated;
grant execute on function public.undo_last_scoring_event(uuid, text) to authenticated;
grant execute on function public.complete_scoring_bye(uuid) to authenticated;

alter publication supabase_realtime add table public.scoring_matches;
alter publication supabase_realtime add table public.scoring_match_events;
