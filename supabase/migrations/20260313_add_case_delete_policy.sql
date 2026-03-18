drop policy if exists "Users can update their own cases" on public.cases;
create policy "Users can update their own cases"
  on public.cases
  for update
  to authenticated
  using (auth.uid() = created_by)
  with check (auth.uid() = created_by);

drop policy if exists "Users can delete their own cases" on public.cases;
create policy "Users can delete their own cases"
  on public.cases
  for delete
  to authenticated
  using (auth.uid() = created_by);
