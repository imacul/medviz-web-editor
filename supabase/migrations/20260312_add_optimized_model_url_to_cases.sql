alter table public.cases
  add column if not exists optimized_model_url text;

drop policy if exists "Users can update their own cases" on public.cases;
create policy "Users can update their own cases"
  on public.cases
  for update
  to authenticated
  using (auth.uid() = created_by)
  with check (auth.uid() = created_by);
