-- Preserve the browser catalog identity when the local project is synchronized.
alter table public.catalog_items
  add column local_id text not null default gen_random_uuid()::text
  check (char_length(trim(local_id)) between 1 and 160);

create unique index catalog_items_project_local_id_idx
  on public.catalog_items (project_id, local_id);
