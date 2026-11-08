-- Rayzen Marcenaria: first cloud foundation.
-- Apply through the Supabase CLI or Dashboard after a project is created.
-- This migration intentionally contains no customer data or credentials.

create extension if not exists pgcrypto with schema extensions;

create type public.internal_role as enum ('representante', 'marceneiro');
create type public.approval_channel as enum ('sistema_comercial', 'whatsapp');

create table public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  display_name text not null check (char_length(trim(display_name)) between 1 and 120),
  role public.internal_role not null,
  created_at timestamptz not null default now()
);

create table public.projects (
  id uuid primary key default gen_random_uuid(),
  title text not null check (char_length(trim(title)) between 1 and 160),
  owner_id uuid not null references public.profiles (id),
  created_at timestamptz not null default now(),
  archived_at timestamptz
);

create table public.project_members (
  project_id uuid not null references public.projects (id) on delete cascade,
  user_id uuid not null references public.profiles (id) on delete cascade,
  added_at timestamptz not null default now(),
  primary key (project_id, user_id)
);

create table public.revisions (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects (id) on delete restrict,
  number integer not null check (number > 0),
  model jsonb not null,
  created_by uuid not null references public.profiles (id),
  created_at timestamptz not null default now(),
  unique (project_id, number)
);

create table public.parts (
  id uuid primary key default gen_random_uuid(),
  revision_id uuid not null references public.revisions (id) on delete cascade,
  piece_code text not null check (piece_code ~ '^[A-Z0-9][A-Z0-9-]{0,63}$'),
  name text not null check (char_length(trim(name)) between 1 and 160),
  quantity integer not null check (quantity > 0),
  length_mm numeric(10, 2) not null check (length_mm > 0),
  width_mm numeric(10, 2) not null check (width_mm > 0),
  thickness_mm numeric(10, 2) not null check (thickness_mm > 0),
  material text not null check (char_length(trim(material)) between 1 and 120),
  edges text not null default '',
  unique (revision_id, piece_code)
);

create table public.shared_links (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects (id) on delete cascade,
  revision_id uuid not null references public.revisions (id) on delete restrict,
  token_digest bytea not null unique,
  expires_at timestamptz not null,
  revoked_at timestamptz,
  created_by uuid not null references public.profiles (id),
  created_at timestamptz not null default now(),
  check (expires_at > created_at)
);

create table public.commercial_approvals (
  id uuid primary key default gen_random_uuid(),
  revision_id uuid not null unique references public.revisions (id) on delete restrict,
  recorded_by uuid not null references public.profiles (id),
  channel public.approval_channel not null,
  evidence_reference text not null check (char_length(trim(evidence_reference)) between 1 and 500),
  recorded_at timestamptz not null default now()
);

create table public.production_releases (
  id uuid primary key default gen_random_uuid(),
  revision_id uuid not null unique references public.revisions (id) on delete restrict,
  released_by uuid not null references public.profiles (id),
  checklist_snapshot jsonb not null,
  released_at timestamptz not null default now()
);

create table public.audit_events (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects (id) on delete restrict,
  revision_id uuid references public.revisions (id) on delete restrict,
  actor_id uuid references public.profiles (id) on delete set null,
  event_type text not null check (event_type ~ '^[a-z][a-z0-9_.-]{0,79}$'),
  details jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index revisions_project_number_idx on public.revisions (project_id, number desc);
create index parts_revision_idx on public.parts (revision_id);
create index audit_events_project_created_idx on public.audit_events (project_id, created_at desc);
create index shared_links_active_idx on public.shared_links (revision_id, expires_at) where revoked_at is null;

create or replace function public.is_project_member(p_project_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.project_members member
    where member.project_id = p_project_id
      and member.user_id = auth.uid()
  );
$$;

create or replace function public.has_internal_role(p_role public.internal_role)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.profiles profile
    where profile.id = auth.uid() and profile.role = p_role
  );
$$;

create or replace function public.can_access_project_file(p_object_name text)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.project_members member
    where member.user_id = auth.uid()
      and member.project_id::text = split_part(p_object_name, '/', 1)
  );
$$;

alter table public.profiles enable row level security;
alter table public.projects enable row level security;
alter table public.project_members enable row level security;
alter table public.revisions enable row level security;
alter table public.parts enable row level security;
alter table public.shared_links enable row level security;
alter table public.commercial_approvals enable row level security;
alter table public.production_releases enable row level security;
alter table public.audit_events enable row level security;

create policy "internal users read their profile" on public.profiles
  for select to authenticated using (id = auth.uid());

create policy "members read projects" on public.projects
  for select to authenticated using (public.is_project_member(id) or owner_id = auth.uid());
create policy "users create their own projects" on public.projects
  for insert to authenticated with check (owner_id = auth.uid());

create policy "members read memberships" on public.project_members
  for select to authenticated using (public.is_project_member(project_id));
create policy "owners add themselves on creation" on public.project_members
  for insert to authenticated with check (
    user_id = auth.uid()
    and exists (select 1 from public.projects where id = project_id and owner_id = auth.uid())
  );

create policy "members read revisions" on public.revisions
  for select to authenticated using (public.is_project_member(project_id));
create policy "members create revisions" on public.revisions
  for insert to authenticated with check (
    created_by = auth.uid() and public.is_project_member(project_id)
  );

create policy "members read revision parts" on public.parts
  for select to authenticated using (
    exists (
      select 1 from public.revisions revision
      where revision.id = revision_id and public.is_project_member(revision.project_id)
    )
  );
create policy "revision author creates parts" on public.parts
  for insert to authenticated with check (
    exists (
      select 1 from public.revisions revision
      where revision.id = revision_id
        and revision.created_by = auth.uid()
        and public.is_project_member(revision.project_id)
    )
    and not exists (select 1 from public.commercial_approvals where revision_id = parts.revision_id)
    and not exists (select 1 from public.production_releases where revision_id = parts.revision_id)
  );

create policy "members read project links" on public.shared_links
  for select to authenticated using (public.is_project_member(project_id));
create policy "members read approvals" on public.commercial_approvals
  for select to authenticated using (
    exists (
      select 1 from public.revisions revision
      where revision.id = revision_id and public.is_project_member(revision.project_id)
    )
  );
create policy "members read production releases" on public.production_releases
  for select to authenticated using (
    exists (
      select 1 from public.revisions revision
      where revision.id = revision_id and public.is_project_member(revision.project_id)
    )
  );
create policy "members read audit events" on public.audit_events
  for select to authenticated using (public.is_project_member(project_id));

-- Public links are read through get_shared_revision only; shared_links itself has no anon policy.
create or replace function public.create_shared_link(
  p_revision_id uuid,
  p_expires_at timestamptz default now() + interval '10 days'
)
returns table (link_id uuid, token text, expires_at timestamptz)
language plpgsql
security definer
set search_path = public
as $$
declare
  revision_project_id uuid;
  raw_token text;
begin
  select project_id into revision_project_id from public.revisions where id = p_revision_id;
  if revision_project_id is null or not public.is_project_member(revision_project_id) then
    raise exception 'Revisão não encontrada ou sem acesso';
  end if;
  if p_expires_at <= now() or p_expires_at > now() + interval '10 days' then
    raise exception 'O link deve expirar em até dez dias';
  end if;

  raw_token := encode(extensions.gen_random_bytes(32), 'hex');
  insert into public.shared_links (project_id, revision_id, token_digest, expires_at, created_by)
  values (revision_project_id, p_revision_id, extensions.digest(convert_to(raw_token, 'UTF8'), 'sha256'), p_expires_at, auth.uid())
  returning id, raw_token, shared_links.expires_at into link_id, token, expires_at;
  return next;
end;
$$;

create or replace function public.revoke_shared_link(p_link_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  update public.shared_links
  set revoked_at = now()
  where id = p_link_id
    and revoked_at is null
    and public.is_project_member(project_id);
  if not found then
    raise exception 'Link não encontrado, já revogado ou sem acesso';
  end if;
end;
$$;

create or replace function public.get_shared_revision(p_token text)
returns table (project_title text, revision_number integer, model jsonb, expires_at timestamptz)
language sql
stable
security definer
set search_path = public
as $$
  select project.title, revision.number, revision.model, link.expires_at
  from public.shared_links link
  join public.projects project on project.id = link.project_id
  join public.revisions revision on revision.id = link.revision_id
  where link.token_digest = extensions.digest(convert_to(p_token, 'UTF8'), 'sha256')
    and link.revoked_at is null
    and link.expires_at > now();
$$;

create or replace function public.record_commercial_approval(
  p_revision_id uuid,
  p_channel public.approval_channel,
  p_evidence_reference text
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  approval_id uuid;
begin
  if not public.has_internal_role('representante') then
    raise exception 'Somente o representante pode registrar aprovação comercial';
  end if;
  if not exists (
    select 1 from public.revisions revision
    where revision.id = p_revision_id and public.is_project_member(revision.project_id)
  ) then
    raise exception 'Revisão não encontrada ou sem acesso';
  end if;
  insert into public.commercial_approvals (revision_id, recorded_by, channel, evidence_reference)
  values (p_revision_id, auth.uid(), p_channel, p_evidence_reference)
  returning id into approval_id;
  return approval_id;
end;
$$;

create or replace function public.release_production(
  p_revision_id uuid,
  p_checklist_snapshot jsonb
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  release_id uuid;
begin
  if not public.has_internal_role('marceneiro') then
    raise exception 'Somente o marceneiro pode liberar produção';
  end if;
  if not exists (
    select 1 from public.revisions revision
    where revision.id = p_revision_id and public.is_project_member(revision.project_id)
  ) then
    raise exception 'Revisão não encontrada ou sem acesso';
  end if;
  if not exists (select 1 from public.commercial_approvals where revision_id = p_revision_id) then
    raise exception 'Aprovação comercial ausente';
  end if;
  if jsonb_typeof(p_checklist_snapshot) <> 'object' or p_checklist_snapshot = '{}'::jsonb then
    raise exception 'Checklist técnico obrigatório';
  end if;
  insert into public.production_releases (revision_id, released_by, checklist_snapshot)
  values (p_revision_id, auth.uid(), p_checklist_snapshot)
  returning id into release_id;
  return release_id;
end;
$$;

revoke all on function public.is_project_member(uuid) from public;
revoke all on function public.has_internal_role(public.internal_role) from public;
revoke all on function public.can_access_project_file(text) from public;
revoke all on function public.create_shared_link(uuid, timestamptz) from public;
revoke all on function public.revoke_shared_link(uuid) from public;
revoke all on function public.get_shared_revision(text) from public;
revoke all on function public.record_commercial_approval(uuid, public.approval_channel, text) from public;
revoke all on function public.release_production(uuid, jsonb) from public;

grant execute on function public.create_shared_link(uuid, timestamptz) to authenticated;
grant execute on function public.revoke_shared_link(uuid) to authenticated;
grant execute on function public.get_shared_revision(text) to anon, authenticated;
grant execute on function public.record_commercial_approval(uuid, public.approval_channel, text) to authenticated;
grant execute on function public.release_production(uuid, jsonb) to authenticated;

insert into storage.buckets (id, name, public, file_size_limit)
values ('project-files', 'project-files', false, 26214400)
on conflict (id) do nothing;

create policy "members read project files" on storage.objects
  for select to authenticated using (
    bucket_id = 'project-files' and public.can_access_project_file(name)
  );
create policy "members upload project files" on storage.objects
  for insert to authenticated with check (
    bucket_id = 'project-files' and public.can_access_project_file(name)
  );

comment on table public.revisions is 'Immutable project snapshots. No update/delete policy is intentionally present.';
comment on table public.parts is 'Manufacturing parts tied to a single immutable revision.';
comment on table public.shared_links is 'Only SHA-256 token digests are stored. Raw tokens are returned once by create_shared_link.';
