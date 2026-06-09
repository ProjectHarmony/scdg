-- S-CDG React + Supabase schema
-- Run this in Supabase Dashboard > SQL Editor.

create extension if not exists pgcrypto;

create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  email text not null,
  role text not null default 'admin',
  created_at timestamptz not null default now()
);

create table if not exists public.players (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  image_url text default '',
  mmr integer not null default 1000,
  wins integer not null default 0,
  losses integer not null default 0,
  matches_played integer not null default 0,
  is_active boolean not null default true,
  role text default '',
  type text default '',
  badge text default '',
  deck_image_url text default '',
  description text default '',
  combo text default '',
  main_text text default '',
  style_text text default '',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.players add column if not exists image_url text default '';
alter table public.players add column if not exists mmr integer not null default 1000;
alter table public.players add column if not exists wins integer not null default 0;
alter table public.players add column if not exists losses integer not null default 0;
alter table public.players add column if not exists matches_played integer not null default 0;
alter table public.players add column if not exists is_active boolean not null default true;
alter table public.players add column if not exists updated_at timestamptz not null default now();

create table if not exists public.gallery (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  category text default '',
  image_url text not null,
  caption text default '',
  created_at timestamptz not null default now()
);

create table if not exists public.events (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  event_date date not null,
  location text default '',
  image_url text default '',
  registration_url text default '',
  is_active boolean not null default true,
  description text default '',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.events add column if not exists location text default '';
alter table public.events add column if not exists image_url text default '';
alter table public.events add column if not exists registration_url text default '';
alter table public.events add column if not exists is_active boolean not null default true;
alter table public.events add column if not exists updated_at timestamptz not null default now();
do $$
begin
  if exists (
    select 1 from information_schema.columns
    where table_schema = 'public' and table_name = 'events' and column_name = 'venue'
  ) then
    execute 'update public.events set location = coalesce(nullif(location, ''''), venue)';
  end if;
end $$;

create table if not exists public.founders (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  role text default '',
  description text default '',
  image_url text default '',
  display_order integer default 0,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.match_results (
  id uuid primary key default gen_random_uuid(),
  tournament_name text default '',
  match_id text not null unique,
  player_1 text not null,
  player_2 text not null,
  winner text not null,
  score text default '',
  match_date date,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.store_items (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  description text default '',
  price text default '',
  image_url text default '',
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.social_links (
  id uuid primary key default gen_random_uuid(),
  label text not null,
  url text not null default '',
  display_order integer default 0,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.contact_messages (
  id uuid primary key default gen_random_uuid(),
  full_name text not null,
  email text not null,
  message text not null,
  created_at timestamptz not null default now()
);

alter table public.profiles enable row level security;
alter table public.players enable row level security;
alter table public.gallery enable row level security;
alter table public.events enable row level security;
alter table public.founders enable row level security;
alter table public.match_results enable row level security;
alter table public.store_items enable row level security;
alter table public.social_links enable row level security;
alter table public.contact_messages enable row level security;

create or replace function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.profiles
    where id = auth.uid() and role = 'admin'
  );
$$;

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists set_founders_updated_at on public.founders;
create trigger set_founders_updated_at
before update on public.founders
for each row execute function public.set_updated_at();

drop trigger if exists set_events_updated_at on public.events;
create trigger set_events_updated_at
before update on public.events
for each row execute function public.set_updated_at();

drop trigger if exists set_players_updated_at on public.players;
create trigger set_players_updated_at
before update on public.players
for each row execute function public.set_updated_at();

drop trigger if exists set_match_results_updated_at on public.match_results;
create trigger set_match_results_updated_at
before update on public.match_results
for each row execute function public.set_updated_at();

drop trigger if exists set_store_items_updated_at on public.store_items;
create trigger set_store_items_updated_at
before update on public.store_items
for each row execute function public.set_updated_at();

drop trigger if exists set_social_links_updated_at on public.social_links;
create trigger set_social_links_updated_at
before update on public.social_links
for each row execute function public.set_updated_at();

-- Public read
drop policy if exists "public read players" on public.players;
create policy "public read players" on public.players for select using (is_active = true);
drop policy if exists "public read gallery" on public.gallery;
create policy "public read gallery" on public.gallery for select using (true);
drop policy if exists "public read events" on public.events;
create policy "public read events" on public.events for select using (is_active = true);
drop policy if exists "public read founders" on public.founders;
create policy "public read founders" on public.founders for select using (is_active = true);
drop policy if exists "public read store items" on public.store_items;
create policy "public read store items" on public.store_items for select using (is_active = true);
drop policy if exists "public read social links" on public.social_links;
create policy "public read social links" on public.social_links for select using (is_active = true);

-- Public inserts for visitor contact messages
do $$
begin
  if to_regclass('public.event_registrations') is not null then
    execute 'drop policy if exists "public create registrations" on public.event_registrations';
  end if;
end $$;

drop policy if exists "public create messages" on public.contact_messages;
create policy "public create messages" on public.contact_messages for insert with check (true);

-- Admin management
drop policy if exists "admin manage profiles" on public.profiles;
create policy "admin manage profiles" on public.profiles for all using (public.is_admin()) with check (public.is_admin());
drop policy if exists "admin manage players" on public.players;
create policy "admin manage players" on public.players for all using (public.is_admin()) with check (public.is_admin());
drop policy if exists "admin manage gallery" on public.gallery;
create policy "admin manage gallery" on public.gallery for all using (public.is_admin()) with check (public.is_admin());
drop policy if exists "admin manage events" on public.events;
create policy "admin manage events" on public.events for all using (public.is_admin()) with check (public.is_admin());
drop policy if exists "admin manage founders" on public.founders;
create policy "admin manage founders" on public.founders for all using (public.is_admin()) with check (public.is_admin());
drop policy if exists "admin manage match results" on public.match_results;
create policy "admin manage match results" on public.match_results for all using (public.is_admin()) with check (public.is_admin());
drop policy if exists "admin manage store items" on public.store_items;
create policy "admin manage store items" on public.store_items for all using (public.is_admin()) with check (public.is_admin());
drop policy if exists "admin manage social links" on public.social_links;
create policy "admin manage social links" on public.social_links for all using (public.is_admin()) with check (public.is_admin());
drop policy if exists "admin read messages" on public.contact_messages;
create policy "admin read messages" on public.contact_messages for select using (public.is_admin());

-- Storage bucket for gallery/player images.
insert into storage.buckets (id, name, public)
values ('scdg-media', 'scdg-media', true)
on conflict (id) do nothing;

drop policy if exists "public read scdg media" on storage.objects;
create policy "public read scdg media"
on storage.objects for select
using (bucket_id = 'scdg-media');

drop policy if exists "admin upload scdg media" on storage.objects;
create policy "admin upload scdg media"
on storage.objects for insert
with check (bucket_id = 'scdg-media' and public.is_admin());

drop policy if exists "admin update scdg media" on storage.objects;
create policy "admin update scdg media"
on storage.objects for update
using (bucket_id = 'scdg-media' and public.is_admin())
with check (bucket_id = 'scdg-media' and public.is_admin());

drop policy if exists "admin delete scdg media" on storage.objects;
create policy "admin delete scdg media"
on storage.objects for delete
using (bucket_id = 'scdg-media' and public.is_admin());

-- Optional seed data
insert into public.players (name, image_url, mmr, wins, losses, matches_played, is_active, role, type, badge, deck_image_url, description, combo, main_text, style_text)
values
('X', 'https://placehold.co/700x700/0b0b0b/f5d78e?text=X', 1000, 0, 0, 0, true, 'Balance Blader', 'Balance Type', 'Main Blader', 'https://placehold.co/700x500/0b0b0b/f5d78e?text=Deck', 'A strategic blader focused on clean launches and reading opponents.', 'Dran Sword 3-60 Rush', 'Attack', 'Strategic'),
('Player X', 'https://placehold.co/700x700/0b0b0b/f5d78e?text=Player+X', 1000, 0, 0, 0, true, 'Attack Type', 'Attack Type', 'Aggressive Blader', 'https://placehold.co/700x500/0b0b0b/f5d78e?text=Attack+Deck', 'Fast-paced attacker with explosive launch pressure.', 'Dran Buster 1-60 Rush', 'Attack', 'KO Focus')
on conflict do nothing;

insert into public.gallery (title, category, image_url, caption)
values
('Tournament Night', 'Event', 'https://placehold.co/900x650/0b0b0b/f5d78e?text=Tournament+Night', 'Local friendly battles and training.'),
('Deck Testing', 'Training', 'https://placehold.co/900x650/0b0b0b/f5d78e?text=Deck+Testing', '3V3 lineup practice.')
on conflict do nothing;

insert into public.founders (name, role, description, image_url, display_order, is_active)
values
('Founder One', 'S-CDG Founder', 'Community lead focused on events, player growth, and fair competition.', '', 1, true),
('Founder Two', 'Tournament Lead', 'Helps organize brackets, training sessions, and match-day flow.', '', 2, true),
('Representative One', 'Blader Representative', 'Supports new players with deck building and battle preparation.', '', 3, true),
('Representative Two', 'Community Representative', 'Connects S-CDG with local players, shops, and partner communities.', '', 4, true)
on conflict do nothing;

insert into public.events (title, event_date, location, image_url, registration_url, is_active, description)
values
('S-CDG Open Battle', '2026-05-18', 'Local Stadium', '', '', true, 'Open Beyblade X 3V3 tournament for community members.'),
('Deck Building Clinic', '2026-06-01', 'Training Hub', '', '', true, 'Learn attack, defense, stamina, and balance setups.')
on conflict do nothing;

insert into public.store_items (name, description, price, image_url, is_active)
values
('S-CDG Community Shirt', 'Official community shirt placeholder for future merch details.', 'Price TBA', '', true),
('BouncyDragon Shirt', 'Partner shirt placeholder for future product photos and sizing.', 'Price TBA', '', true)
on conflict do nothing;

insert into public.social_links (label, url, display_order, is_active)
values
('Facebook', 'https://www.facebook.com/scdgbladers', 1, true),
('BouncyDragon Facebook', 'https://www.facebook.com/bouncydragy.tv', 2, true)
on conflict do nothing;

-- After creating an auth user in Supabase Auth, run this with that user's UUID:
-- insert into public.profiles (id, email, role) values ('AUTH_USER_UUID', 'admin@email.com', 'admin');
