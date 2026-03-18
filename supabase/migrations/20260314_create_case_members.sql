-- Team collaboration: case members table
create table if not exists public.case_members (
  id          uuid primary key default gen_random_uuid(),
  case_id     uuid not null references public.cases(id) on delete cascade,
  user_id     uuid not null references auth.users(id) on delete cascade,
  role        text not null default 'viewer' check (role in ('editor', 'viewer')),
  invited_by  uuid not null references auth.users(id),
  member_email text,
  joined_at   timestamptz not null default timezone('utc', now()),
  unique (case_id, user_id)
);

create index if not exists case_members_case_id_idx on public.case_members (case_id);
create index if not exists case_members_user_id_idx on public.case_members (user_id);

alter table public.case_members enable row level security;

-- Helper: check case ownership without triggering RLS (breaks recursion)
create or replace function public.is_case_owner(p_case_id uuid)
returns boolean
language sql
security definer
stable
set search_path = public
as $$
  select exists (
    select 1 from public.cases
    where id = p_case_id and created_by = auth.uid()
  );
$$;

-- Case owners can manage all members of their cases
create policy "Case owners can manage members"
  on public.case_members
  for all
  to authenticated
  using (public.is_case_owner(case_id))
  with check (public.is_case_owner(case_id));

-- Case owners can view all members (owners are not in case_members themselves)
create policy "Case owners can view all members"
  on public.case_members
  for select
  to authenticated
  using (public.is_case_owner(case_id));

-- The security-definer function inserts members directly (bypasses RLS),
-- but members still need to be able to read and delete their own row.
create policy "Members can view their own membership"
  on public.case_members
  for select
  to authenticated
  using (user_id = auth.uid());

create policy "Members can leave a case"
  on public.case_members
  for delete
  to authenticated
  using (user_id = auth.uid());

-- ── Re-apply the cases SELECT policy now that case_members exists ─────────────
drop policy if exists "Authenticated users can view accessible cases" on public.cases;

create policy "Authenticated users can view accessible cases"
  on public.cases
  for select
  to authenticated
  using (
    (select auth.uid()) = created_by
    or visibility = 'public'
    or exists (
      select 1 from public.case_members cm
      where cm.case_id = id and cm.user_id = (select auth.uid())
    )
  );

-- ── Security-definer function: look up a case by share token ─────────────────
-- Uses security definer so it can bypass RLS for the lookup,
-- then enforces its own access rules, and auto-adds authenticated visitors as viewer.
create or replace function public.get_case_by_share_token(p_token uuid)
returns setof public.cases
language plpgsql
security definer
set search_path = public
as $$
declare
  v_case   public.cases%rowtype;
  v_uid    uuid;
  v_email  text;
begin
  select * into v_case from public.cases where share_token = p_token;

  -- Token not found
  if not found then
    return;
  end if;

  v_uid := auth.uid();

  -- Unauthenticated visitor: only allow if owner has enabled public access
  if v_uid is null then
    if v_case.visibility = 'public' then
      return next v_case;
    end if;
    return;
  end if;

  -- Owner visiting their own link — just return
  if v_uid = v_case.created_by then
    return next v_case;
    return;
  end if;

  -- Authenticated non-owner: auto-add as viewer (idempotent)
  select email into v_email from auth.users where id = v_uid;

  insert into public.case_members (case_id, user_id, role, invited_by, member_email)
  values (v_case.id, v_uid, 'viewer', v_case.created_by, v_email)
  on conflict (case_id, user_id) do nothing;

  return next v_case;
end;
$$;

grant execute on function public.get_case_by_share_token(uuid) to authenticated, anon;

-- ── Storage: allow team members and public-case visitors to read models ────────
drop policy if exists "Users can read their own case models" on storage.objects;
drop policy if exists "Users can read accessible case models" on storage.objects;
create policy "Users can read accessible case models"
  on storage.objects
  for select
  to authenticated
  using (
    bucket_id = 'case-models'
    and (
      -- Owner
      (storage.foldername(name))[1] = (select auth.uid()::text)
      -- Case member
      or exists (
        select 1 from public.cases c
        join public.case_members cm on cm.case_id = c.id
        where cm.user_id = auth.uid()
        and c.model_url = 'storage://case-models/' || name
      )
    )
  );

drop policy if exists "Anyone can read models for public cases" on storage.objects;
create policy "Anyone can read models for public cases"
  on storage.objects
  for select
  to anon, authenticated
  using (
    bucket_id = 'case-models'
    and exists (
      select 1 from public.cases c
      where c.visibility = 'public'
      and c.model_url = 'storage://case-models/' || name
    )
  );
