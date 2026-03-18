alter table public.cases
  alter column model_url drop not null;

alter table public.cases
  drop constraint if exists cases_model_url_not_blank;

alter table public.cases
  add constraint cases_model_url_not_blank
  check (model_url is null or char_length(btrim(model_url)) > 0);
