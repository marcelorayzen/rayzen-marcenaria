-- Catalog items and preparation checklist snapshots for the first remote sync slice.
-- No production release is granted by this migration.

create table public.catalog_items (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects (id) on delete cascade,
  code text not null check (code ~ '^[A-Z0-9][A-Z0-9-]{0,63}$'),
  name text not null check (char_length(trim(name)) between 1 and 160),
  kind text not null check (kind in ('door', 'drawer', 'hardware', 'equipment')),
  manufacturer text check (manufacturer is null or char_length(trim(manufacturer)) between 1 and 160),
  specifications jsonb not null default '{}'::jsonb check (jsonb_typeof(specifications) = 'object'),
  source_reference text not null check (char_length(trim(source_reference)) between 1 and 500),
  active boolean not null default true,
  created_by uuid not null references public.profiles (id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (project_id, code)
);

create index catalog_items_project_active_idx on public.catalog_items (project_id, active, code);

create table public.readiness_checklists (
  id uuid primary key default gen_random_uuid(),
  revision_id uuid not null unique references public.revisions (id) on delete cascade,
  checklist jsonb not null check (jsonb_typeof(checklist) = 'object'),
  status text not null default 'preparation-only' check (status = 'preparation-only'),
  created_by uuid not null references public.profiles (id),
  created_at timestamptz not null default now()
);

alter table public.catalog_items enable row level security;
alter table public.readiness_checklists enable row level security;

create policy "members read catalog items" on public.catalog_items
  for select to authenticated using (public.is_project_member(project_id));
create policy "members create catalog items" on public.catalog_items
  for insert to authenticated with check (
    created_by = auth.uid() and public.is_project_member(project_id)
  );
create policy "members update catalog items" on public.catalog_items
  for update to authenticated using (public.is_project_member(project_id))
  with check (public.is_project_member(project_id));

create policy "members read readiness checklists" on public.readiness_checklists
  for select to authenticated using (
    exists (
      select 1 from public.revisions revision
      where revision.id = revision_id and public.is_project_member(revision.project_id)
    )
  );
create policy "members create readiness checklists" on public.readiness_checklists
  for insert to authenticated with check (
    created_by = auth.uid()
    and exists (
      select 1 from public.revisions revision
      where revision.id = revision_id and public.is_project_member(revision.project_id)
    )
  );
