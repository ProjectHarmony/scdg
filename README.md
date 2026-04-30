# S-CDG React + Supabase

Vite + React frontend with Supabase Auth, Database, and Storage.

## 1. Install

```bash
npm install
```

## 2. Create Supabase project

1. Go to Supabase and create a project.
2. Open **SQL Editor**.
3. Paste and run `supabase/schema.sql`.
4. Go to **Authentication > Users** and create your admin user.
5. Copy the user's UUID.
6. Run this in SQL Editor:

```sql
insert into public.profiles (id, email, role)
values ('PASTE_AUTH_USER_UUID_HERE', 'your-admin-email@example.com', 'admin');
```

## 3. Add environment variables

Copy `.env.example` to `.env`:

```bash
cp .env.example .env
```

Fill in:

```bash
VITE_SUPABASE_URL=your_supabase_project_url
VITE_SUPABASE_ANON_KEY=your_supabase_anon_key
```

Get these from Supabase **Project Settings > API**.

## 4. Run

```bash
npm run dev
```

## Features

- Public landing page
- Public event list
- Event registration modal saves to Supabase
- Public dynamic gallery from Supabase
- Contact form saves to Supabase
- Admin login with Supabase Auth
- Admin CRUD for players, gallery, and events
- Gallery/player image upload to Supabase Storage bucket `scdg-media`
- Admin can view event registrations and contact messages

## Deploy

Frontend can be deployed to Netlify or Vercel. Add the same environment variables in your hosting dashboard.
