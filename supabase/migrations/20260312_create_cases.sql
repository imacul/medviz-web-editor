create extension if not exists pgcrypto;

do $$
begin
  if not exists (
    select 1
    from pg_type
    where typname = 'case_visibility'
  ) then
    create type public.case_visibility as enum ('private', 'public');
  end if;
end
$$;

create table if not exists public.cases (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  description text,
  model_url text not null,
  created_by uuid not null references auth.users(id) on delete cascade,
  created_at timestamptz not null default timezone('utc', now()),
  visibility public.case_visibility not null default 'private',
  constraint cases_title_not_blank check (char_length(btrim(title)) between 1 and 200),
  constraint cases_model_url_not_blank check (char_length(btrim(model_url)) > 0)
);

create index if not exists cases_created_by_created_at_idx
  on public.cases (created_by, created_at desc);

create index if not exists cases_visibility_created_at_idx
  on public.cases (visibility, created_at desc);

alter table public.cases enable row level security;

drop policy if exists "Users can insert their own cases" on public.cases;
create policy "Users can insert their own cases"
  on public.cases
  for insert
  to authenticated
  with check (auth.uid() = created_by);

drop policy if exists "Users can view their own or public cases" on public.cases;
create policy "Users can view their own or public cases"
  on public.cases
  for select
  to authenticated, anon
  using (visibility = 'public' or auth.uid() = created_by);
