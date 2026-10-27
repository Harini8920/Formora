
-- Formora database schema for Supabase
-- Run in Supabase Dashboard > SQL Editor.

create extension if not exists pgcrypto;

-- 1. Forms created by users
create table if not exists public.forms (
  id text primary key,
  owner_id uuid not null references auth.users(id) on delete cascade,
  title text not null default 'Untitled form',
  description text not null default '',
  published boolean not null default false,
  content jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- 2. Responses submitted to forms
create table if not exists public.responses (
  id uuid primary key default gen_random_uuid(),
  form_id text not null references public.forms(id) on delete cascade,
  answers jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

-- 3. Indexes for faster lookups
create index if not exists forms_owner_updated_idx
  on public.forms(owner_id, updated_at desc);

create index if not exists responses_form_created_idx
  on public.responses(form_id, created_at desc);

-- 4. Enable Row Level Security
alter table public.forms enable row level security;
alter table public.responses enable row level security;

-- 5. Remove existing policies from this schema
drop policy if exists "Owners can view their forms" on public.forms;
drop policy if exists "Owners can insert their forms" on public.forms;
drop policy if exists "Owners can update their forms" on public.forms;
drop policy if exists "Owners can delete their forms" on public.forms;
drop policy if exists "Anyone can view published forms" on public.forms;

drop policy if exists "Owners can read form responses" on public.responses;
drop policy if exists "Owners can delete form responses" on public.responses;
drop policy if exists "Anyone can submit to published forms" on public.responses;

-- 6. Forms: owners can manage their own forms
create policy "Owners can view their forms"
on public.forms
for select
to authenticated
using (auth.uid() = owner_id);

create policy "Owners can insert their forms"
on public.forms
for insert
to authenticated
with check (auth.uid() = owner_id);

create policy "Owners can update their forms"
on public.forms
for update
to authenticated
using (auth.uid() = owner_id)
with check (auth.uid() = owner_id);

create policy "Owners can delete their forms"
on public.forms
for delete
to authenticated
using (auth.uid() = owner_id);

-- 7. Anyone can read published forms
create policy "Anyone can view published forms"
on public.forms
for select
to anon, authenticated
using (published = true);

-- 8. Only owners can read their form responses
create policy "Owners can read form responses"
on public.responses
for select
to authenticated
using (
  exists (
    select 1
    from public.forms f
    where f.id = form_id
      and f.owner_id = auth.uid()
  )
);

-- 9. Only owners can delete their form responses
create policy "Owners can delete form responses"
on public.responses
for delete
to authenticated
using (
  exists (
    select 1
    from public.forms f
    where f.id = form_id
      and f.owner_id = auth.uid()
  )
);

-- 10. Anyone can submit responses to published forms
create policy "Anyone can submit to published forms"
on public.responses
for insert
to anon, authenticated
with check (
  exists (
    select 1
    from public.forms f
    where f.id = form_id
      and f.published = true
  )
);

-- 11. Grant database permissions.
-- RLS policies above still restrict which rows each role can access.
grant usage on schema public to anon, authenticated;

grant select on public.forms to anon, authenticated;
grant insert, update, delete on public.forms to authenticated;

grant insert on public.responses to anon, authenticated;
grant select, delete on public.responses to authenticated;

-- Never put a Supabase service-role key in frontend code.
