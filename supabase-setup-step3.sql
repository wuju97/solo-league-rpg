-- ============================================================
-- SOLO LEAGUE RPG — Database Setup, Step 3
-- Player profiles (gamer names)
-- HOW TO RUN THIS: same as before — Supabase → SQL Editor →
-- New query → paste this in → Run
-- ============================================================

create table profiles (
  user_id uuid primary key references auth.users not null,
  gamer_name text unique,
  created_at timestamptz default now()
);

alter table profiles enable row level security;

-- Players can only see/edit their OWN profile row.
-- (Other players' gamer names reach the chat via the message
-- itself, not by reading this table directly — keeps emails
-- and account info fully private.)
create policy "Players can view their own profile"
  on profiles for select
  using (auth.uid() = user_id);

create policy "Players can create their own profile"
  on profiles for insert
  with check (auth.uid() = user_id);

create policy "Players can update their own profile"
  on profiles for update
  using (auth.uid() = user_id);
