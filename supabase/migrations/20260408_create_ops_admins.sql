create table if not exists public.ops_admins (
  user_id uuid primary key references auth.users (id) on delete cascade,
  granted_by uuid references auth.users (id) on delete set null,
  email text,
  created_at timestamptz not null default timezone('utc', now())
);

alter table public.ops_admins enable row level security;

drop policy if exists "Ops admins can view their own grants" on public.ops_admins;
create policy "Ops admins can view their own grants"
  on public.ops_admins
  for select
  to authenticated
  using (auth.uid() = user_id);
