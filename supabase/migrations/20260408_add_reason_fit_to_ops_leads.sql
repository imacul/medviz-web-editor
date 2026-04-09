alter table public.ops_leads
  add column if not exists reason_fit text;
