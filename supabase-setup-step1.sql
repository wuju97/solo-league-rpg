-- ============================================================
-- SOLO LEAGUE RPG — Database Setup, Step 1
-- HOW TO RUN THIS:
--   1. Go to your Supabase project
--   2. Click "SQL Editor" in the left sidebar
--   3. Click "New query"
--   4. Paste this whole file in
--   5. Click "Run" (bottom right)
-- ============================================================

-- This table stores one row per player character.
create table characters (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users not null unique,

  -- identity
  name text not null,
  class text default 'Unclassed',
  title text default 'Novice',

  -- progression
  level int default 1,
  xp int default 0,
  rank text default 'Unranked',

  -- currency
  gold int default 100,

  -- stats
  attribute_points int default 0,
  strength int default 10,
  agility int default 10,
  intellect int default 10,
  vitality int default 10,

  created_at timestamptz default now()
);

-- Turn on Row Level Security. Without this, ANY logged-in player
-- could read or edit ANY other player's character. This is the
-- switch that prevents that.
alter table characters enable row level security;

-- Policy: a player can only ever SEE their own character row.
create policy "Players can view their own character"
  on characters for select
  using (auth.uid() = user_id);

-- Policy: a player can only INSERT a character row for themselves
-- (so nobody can create a character pretending to be someone else).
create policy "Players can create their own character"
  on characters for insert
  with check (auth.uid() = user_id);

-- Policy: a player can only UPDATE their own character row
-- (so nobody can edit another player's stats or gold).
create policy "Players can update their own character"
  on characters for update
  using (auth.uid() = user_id);
