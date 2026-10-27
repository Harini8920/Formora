-- Formora database schema for Supabase
-- Run this entire file in Supabase Dashboard > SQL Editor.
create extension if not exists pgcrypto;

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

create table if not exists public.responses (
  id uuid primary key default gen_random_uuid(),
  form_id text not null references public.forms(id) on delete cascade,
  answers jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index if not exists forms_owner_updated_idx on public.forms(owner_id, updated_at desc);
create index if not exists responses_form_created_idx on public.responses(form_id, created_at desc);

alter table public.forms enable row level security;
alter table public.responses enable row level security;

-- Owners can manage only their own forms.
drop policy if exists "Owners can view their forms" on public.forms;
create policy "Owners can view their forms" on public.forms for select to authenticated using (auth.uid() = owner_id);
drop policy if exists "Owners can insert their forms" on public.forms;
create policy "Owners can insert their forms" on public.forms for insert to authenticated with check (auth.uid() = owner_id);
drop policy if exists "Owners can update their forms" on public.forms;
create policy "Owners can update their forms" on public.forms for update to authenticated using (auth.uid() = owner_id) with check (auth.uid() = owner_id);
drop policy if exists "Owners can delete their forms" on public.forms;
create policy "Owners can delete their forms" on public.forms for delete to authenticated using (auth.uid() = owner_id);

-- Published forms can be read publicly to render the share page.
drop policy if exists "Anyone can view published forms" on public.forms;
create policy "Anyone can view published forms" on public.forms for select to anon, authenticated using (published = true);

-- Responses: form owners can read/delete submissions for their forms.
drop policy if exists "Owners can read form responses" on public.responses;
create policy "Owners can read form responses" on public.responses for select to authenticated
using (exists (select 1 from public.forms f where f.id = form_id and f.owner_id = auth.uid()));
drop policy if exists "Owners can delete form responses" on public.responses;
create policy "Owners can delete form responses" on public.responses for delete to authenticated
using (exists (select 1 from public.forms f where f.id = form_id and f.owner_id = auth.uid()));

-- Public form respondents can submit only to currently published forms.
drop policy if exists "Anyone can submit to published forms" on public.responses;
create policy "Anyone can submit to published forms" on public.responses for insert to anon, authenticated
with check (exists (select 1 from public.forms f where f.id = form_id and f.published = true));

-- Note: response reads are not granted to anon. Never expose a service-role key in frontend code.
