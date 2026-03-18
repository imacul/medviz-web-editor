-- Threaded comments on cases
create table if not exists public.comments (
  id           uuid primary key default gen_random_uuid(),
  case_id      uuid not null references public.cases(id) on delete cascade,
  user_id      uuid not null references auth.users(id) on delete cascade,
  parent_id    uuid references public.comments(id) on delete cascade,
  content      text not null check (char_length(btrim(content)) between 1 and 2000),
  author_email text not null,
  created_at   timestamptz not null default timezone('utc', now()),
  updated_at   timestamptz not null default timezone('utc', now())
);

create index if not exists comments_case_id_created_at_idx
  on public.comments (case_id, created_at asc);

create index if not exists comments_parent_id_idx
  on public.comments (parent_id);

alter table public.comments enable row level security;

-- Anyone who can see the case can read its comments
create policy "Case viewers can read comments"
  on public.comments
  for select
  to authenticated, anon
  using (
    exists (
      select 1 from public.cases c
      where c.id = case_id
      and (
        c.visibility = 'public'
        or c.created_by = auth.uid()
        or exists (
          select 1 from public.case_members cm
          where cm.case_id = c.id
          and cm.user_id = auth.uid()
        )
      )
    )
  );

-- Authenticated users who have access to the case can comment
create policy "Case members can insert comments"
  on public.comments
  for insert
  to authenticated
  with check (
    auth.uid() = user_id
    and exists (
      select 1 from public.cases c
      where c.id = case_id
      and (
        c.created_by = auth.uid()
        or exists (
          select 1 from public.case_members cm
          where cm.case_id = c.id
          and cm.user_id = auth.uid()
        )
      )
    )
  );

create policy "Users can update their own comments"
  on public.comments
  for update
  to authenticated
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- Case owners can also delete any comment in their case
create policy "Users can delete their own comments"
  on public.comments
  for delete
  to authenticated
  using (
    user_id = (select auth.uid())
    or public.is_case_owner(case_id)
  );
