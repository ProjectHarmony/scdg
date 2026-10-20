create table public.scoring_challonge_oauth_states (
  state text primary key,
  user_id uuid not null references auth.users(id) on delete cascade,
  return_url text not null,
  expires_at timestamptz not null,
  created_at timestamptz not null default now()
);

create table public.scoring_challonge_connections (
  user_id uuid primary key references auth.users(id) on delete cascade,
  challonge_user_id text,
  challonge_username text,
  access_token_encrypted text not null,
  refresh_token_encrypted text,
  token_type text not null default 'Bearer',
  scope text,
  token_expires_at timestamptz not null,
  connected_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.scoring_challonge_oauth_states enable row level security;
alter table public.scoring_challonge_connections enable row level security;

create trigger scoring_challonge_connections_updated_at
before update on public.scoring_challonge_connections
for each row execute function public.set_scoring_updated_at();

create or replace function public.get_challonge_connection_status()
returns table (connected boolean, username text, expires_at timestamptz)
language sql
stable
security definer
set search_path = public
as $$
  select
    count(*) > 0,
    max(challonge_username),
    max(token_expires_at)
  from public.scoring_challonge_connections
  where user_id = auth.uid();
$$;

revoke all on function public.get_challonge_connection_status() from public;
grant execute on function public.get_challonge_connection_status() to authenticated;

create index scoring_oauth_states_expiry_idx
on public.scoring_challonge_oauth_states (expires_at);
