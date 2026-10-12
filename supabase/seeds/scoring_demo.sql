-- Optional development data for testing /judge with the first admin account.
-- Run after 202609240001_scoring_foundation.sql. Safe to run more than once.

do $$
declare
  v_owner uuid;
  v_tournament uuid;
  v_stage uuid;
  v_entry_a uuid;
  v_entry_b uuid;
  v_entry_c uuid;
  v_entry_d uuid;
  v_entry_e uuid;
  v_entry_f uuid;
begin
  select id into v_owner
  from public.profiles
  where role = 'admin'
  order by created_at
  limit 1;

  if v_owner is null then
    raise exception 'Create an admin profile before running the scoring demo seed.';
  end if;

  insert into public.scoring_tournaments (
    owner_id, challonge_tournament_id, name, current_round, status, feature_enabled
  ) values (
    v_owner, -1, 'S-CDG Scoring Demo', 1, 'active', true
  )
  on conflict (owner_id, challonge_tournament_id) do update
  set name = excluded.name,
      current_round = excluded.current_round,
      status = excluded.status,
      feature_enabled = excluded.feature_enabled
  returning id into v_tournament;

  insert into public.scoring_memberships (tournament_id, user_id, role)
  values (v_tournament, v_owner, 'organizer')
  on conflict (tournament_id, user_id) do update set role = excluded.role;

  insert into public.scoring_stages (tournament_id, stage_no, type, target_score, num_rounds, status)
  values (v_tournament, 1, 'swiss', 4, 5, 'active')
  on conflict (tournament_id, stage_no) do update
  set type = excluded.type,
      target_score = excluded.target_score,
      num_rounds = excluded.num_rounds,
      status = excluded.status
  returning id into v_stage;

  insert into public.scoring_entries (tournament_id, challonge_participant_id, display_name, seed)
  values (v_tournament, -101, 'Player Alpha', 1)
  on conflict (tournament_id, challonge_participant_id) do update set display_name = excluded.display_name
  returning id into v_entry_a;

  insert into public.scoring_entries (tournament_id, challonge_participant_id, display_name, seed)
  values (v_tournament, -102, 'Player Bravo', 2)
  on conflict (tournament_id, challonge_participant_id) do update set display_name = excluded.display_name
  returning id into v_entry_b;

  insert into public.scoring_entries (tournament_id, challonge_participant_id, display_name, seed)
  values (v_tournament, -103, 'Player Charlie', 3)
  on conflict (tournament_id, challonge_participant_id) do update set display_name = excluded.display_name
  returning id into v_entry_c;

  insert into public.scoring_entries (tournament_id, challonge_participant_id, display_name, seed)
  values (v_tournament, -104, 'Player Delta', 4)
  on conflict (tournament_id, challonge_participant_id) do update set display_name = excluded.display_name
  returning id into v_entry_d;

  insert into public.scoring_entries (tournament_id, challonge_participant_id, display_name, seed)
  values (v_tournament, -105, 'Player Echo', 5)
  on conflict (tournament_id, challonge_participant_id) do update set display_name = excluded.display_name
  returning id into v_entry_e;

  insert into public.scoring_entries (tournament_id, challonge_participant_id, display_name, seed)
  values (v_tournament, -106, 'Player Foxtrot', 6)
  on conflict (tournament_id, challonge_participant_id) do update set display_name = excluded.display_name
  returning id into v_entry_f;

  insert into public.scoring_matches (
    tournament_id, stage_id, challonge_match_id, round, table_no,
    entry_a_id, entry_b_id, assigned_judge_id
  ) values
    (v_tournament, v_stage, -1001, 1, '01', v_entry_a, v_entry_b, v_owner),
    (v_tournament, v_stage, -1002, 1, '02', v_entry_c, v_entry_d, v_owner),
    (v_tournament, v_stage, -1003, 1, '03', v_entry_e, v_entry_f, v_owner)
  on conflict (tournament_id, challonge_match_id) do update
  set stage_id = excluded.stage_id,
      round = excluded.round,
      table_no = excluded.table_no,
      entry_a_id = excluded.entry_a_id,
      entry_b_id = excluded.entry_b_id,
      assigned_judge_id = excluded.assigned_judge_id;
end;
$$;
