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
  role text default '',
  type text default '',
  badge text default '',
  image_url text default '',
  deck_image_url text default '',
  description text default '',
  combo text default '',
  main_text text default '',
  style_text text default '',
  created_at timestamptz not null default now()
);

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
  venue text default '',
  slots integer default 0,
  description text default '',
  created_at timestamptz not null default now()
);

create table if not exists public.event_registrations (
  id uuid primary key default gen_random_uuid(),
  event_id uuid references public.events(id) on delete cascade,
  event_title text default '',
  full_name text not null,
  email text not null,
  phone text default '',
  deck_notes text default '',
  created_at timestamptz not null default now()
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
alter table public.event_registrations enable row level security;
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

-- Public read
drop policy if exists "public read players" on public.players;
create policy "public read players" on public.players for select using (true);
drop policy if exists "public read gallery" on public.gallery;
create policy "public read gallery" on public.gallery for select using (true);
drop policy if exists "public read events" on public.events;
create policy "public read events" on public.events for select using (true);

-- Public inserts for visitor forms
drop policy if exists "public create registrations" on public.event_registrations;
create policy "public create registrations" on public.event_registrations for insert with check (true);
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
drop policy if exists "admin read registrations" on public.event_registrations;
create policy "admin read registrations" on public.event_registrations for select using (public.is_admin());
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
insert into public.players (name, role, type, badge, image_url, deck_image_url, description, combo, main_text, style_text)
values
('X', 'Balance Blader', 'Balance Type', 'Main Blader', 'https://placehold.co/700x700/0b0b0b/f5d78e?text=X', 'https://placehold.co/700x500/0b0b0b/f5d78e?text=Deck', 'A strategic blader focused on clean launches and reading opponents.', 'Dran Sword 3-60 Rush', 'Attack', 'Strategic'),
('Player X', 'Attack Type', 'Attack Type', 'Aggressive Blader', 'https://placehold.co/700x700/0b0b0b/f5d78e?text=Player+X', 'https://placehold.co/700x500/0b0b0b/f5d78e?text=Attack+Deck', 'Fast-paced attacker with explosive launch pressure.', 'Dran Buster 1-60 Rush', 'Attack', 'KO Focus')
on conflict do nothing;

insert into public.gallery (title, category, image_url, caption)
values
('Tournament Night', 'Event', 'https://placehold.co/900x650/0b0b0b/f5d78e?text=Tournament+Night', 'Local friendly battles and training.'),
('Deck Testing', 'Training', 'https://placehold.co/900x650/0b0b0b/f5d78e?text=Deck+Testing', '3V3 lineup practice.')
on conflict do nothing;

insert into public.events (title, event_date, venue, slots, description)
values
('S-CDG Open Battle', '2026-05-18', 'Local Stadium', 32, 'Open Beyblade X 3V3 tournament for community members.'),
('Deck Building Clinic', '2026-06-01', 'Training Hub', 20, 'Learn attack, defense, stamina, and balance setups.')
on conflict do nothing;

-- After creating an auth user in Supabase Auth, run this with that user's UUID:
-- insert into public.profiles (id, email, role) values ('AUTH_USER_UUID', 'admin@email.com', 'admin');
