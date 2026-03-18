-- Add editor_state column to cases table for persisting annotations, measurements, camera and paint
alter table public.cases
  add column if not exists editor_state jsonb default null;

-- Enable Realtime for the cases table so editor state syncs live across team members
-- (safe to run even if already added — DO block avoids the duplicate error)
do $$
begin
  alter publication supabase_realtime add table public.cases;
exception when others then
  -- already in publication, ignore
end;
$$;

-- Rebuild the storage SELECT policy so case members can also read model files.
-- Drops both the old owner-only policy and any previous broad policy first.
drop policy if exists "Users can read their own case models" on storage.objects;
drop policy if exists "Users can read accessible case models" on storage.objects;
drop policy if exists "Anyone can read models for public cases" on storage.objects;

create policy "Users can read accessible case models"
  on storage.objects for select to authenticated
  using (
    bucket_id = 'case-models' and (
      -- Owner: files in their own folder
      (storage.foldername(name))[1] = (select auth.uid()::text)
      or
      -- Member: joined a case whose model_url maps to this file
      exists (
        select 1 from public.case_members cm
        join public.cases c on c.id = cm.case_id
        where cm.user_id = (select auth.uid())
          and c.model_url = 'storage://case-models/' || name
      )
    )
  );

create policy "Anyone can read models for public cases"
  on storage.objects for select to anon, authenticated
  using (
    bucket_id = 'case-models'
    and exists (
      select 1 from public.cases c
      where c.visibility = 'public'
        and c.model_url = 'storage://case-models/' || name
    )
  );
