-- share_token: generated once per case, permanent, used for the shareable link
alter table public.cases
  add column if not exists share_token uuid unique default gen_random_uuid();

update public.cases set share_token = gen_random_uuid() where share_token is null;
alter table public.cases alter column share_token set not null;

create index if not exists cases_share_token_idx on public.cases (share_token);

-- ── RLS policies ─────────────────────────────────────────────────────────────

-- Drop the old combined policy (if it exists from before)
drop policy if exists "Users can view their own or public cases" on public.cases;
drop policy if exists "Authenticated users can view accessible cases" on public.cases;
drop policy if exists "Anon users can view public cases only" on public.cases;

-- Simple authenticated policy (no case_members reference yet — added in migration 2)
create policy "Authenticated users can view accessible cases"
  on public.cases
  for select
  to authenticated
  using (
    auth.uid() = created_by
    or visibility = 'public'
  );

-- Unauthenticated users: ONLY explicitly public cases
create policy "Anon users can view public cases only"
  on public.cases
  for select
  to anon
  using (visibility = 'public');
