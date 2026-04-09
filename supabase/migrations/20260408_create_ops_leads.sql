create extension if not exists pgcrypto;

do $$
begin
  if not exists (
    select 1
    from pg_type
    where typname = 'ops_lead_stage'
  ) then
    create type public.ops_lead_stage as enum (
      'sourced',
      'contacted',
      'replied',
      'qualified',
      'pilot',
      'won',
      'lost'
    );
  end if;
end
$$;

create or replace function public.set_row_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = timezone('utc', now());
  return new;
end;
$$;

create table if not exists public.ops_leads (
  id uuid primary key default gen_random_uuid(),
  owner_user_id uuid not null references auth.users(id) on delete cascade,
  account_name text not null,
  contact_name text not null,
  contact_email text,
  contact_route text,
  segment text,
  stage public.ops_lead_stage not null default 'sourced',
  priority smallint not null default 2,
  source_url text,
  next_action text,
  notes text,
  last_outreach_at timestamptz,
  last_reply_at timestamptz,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  constraint ops_leads_account_name_not_blank check (char_length(btrim(account_name)) between 1 and 200),
  constraint ops_leads_contact_name_not_blank check (char_length(btrim(contact_name)) between 1 and 200),
  constraint ops_leads_priority_range check (priority between 1 and 3)
);

create index if not exists ops_leads_owner_stage_created_at_idx
  on public.ops_leads (owner_user_id, stage, created_at desc);

drop trigger if exists ops_leads_set_updated_at on public.ops_leads;
create trigger ops_leads_set_updated_at
  before update on public.ops_leads
  for each row
  execute function public.set_row_updated_at();

alter table public.ops_leads enable row level security;

drop policy if exists "Users can view their own ops leads" on public.ops_leads;
create policy "Users can view their own ops leads"
  on public.ops_leads
  for select
  to authenticated
  using (auth.uid() = owner_user_id);

drop policy if exists "Users can insert their own ops leads" on public.ops_leads;
create policy "Users can insert their own ops leads"
  on public.ops_leads
  for insert
  to authenticated
  with check (auth.uid() = owner_user_id);

drop policy if exists "Users can update their own ops leads" on public.ops_leads;
create policy "Users can update their own ops leads"
  on public.ops_leads
  for update
  to authenticated
  using (auth.uid() = owner_user_id)
  with check (auth.uid() = owner_user_id);

drop policy if exists "Users can delete their own ops leads" on public.ops_leads;
create policy "Users can delete their own ops leads"
  on public.ops_leads
  for delete
  to authenticated
  using (auth.uid() = owner_user_id);
