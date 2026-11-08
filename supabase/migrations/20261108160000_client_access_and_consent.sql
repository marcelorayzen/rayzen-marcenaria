-- Customer access is intentionally separate from internal profiles.
-- Phone OTP issuance/verification is performed by Supabase Auth; no OTP value
-- is stored here.

create type public.client_invite_status as enum (
  'created',
  'delivered',
  'verified',
  'expired',
  'revoked'
);

create type public.client_confirmation_status as enum (
  'confirmed',
  'change_requested'
);

create type public.consent_status as enum ('active', 'withdrawn');

create table public.client_profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  phone_e164 text not null unique check (phone_e164 ~ '^\+[1-9][0-9]{7,14}$'),
  display_name text check (display_name is null or char_length(trim(display_name)) between 1 and 120),
  created_at timestamptz not null default now()
);

create table public.client_project_access (
  project_id uuid not null references public.projects (id) on delete cascade,
  client_id uuid not null references public.client_profiles (id) on delete cascade,
  granted_by uuid not null references public.profiles (id) on delete restrict,
  granted_at timestamptz not null default now(),
  revoked_at timestamptz,
  primary key (project_id, client_id)
);

create table public.client_invites (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects (id) on delete cascade,
  phone_e164 text not null check (phone_e164 ~ '^\+[1-9][0-9]{7,14}$'),
  status public.client_invite_status not null default 'created',
  created_by uuid not null references public.profiles (id) on delete restrict,
  created_at timestamptz not null default now(),
  expires_at timestamptz not null,
  delivered_at timestamptz,
  verified_at timestamptz,
  revoked_at timestamptz,
  client_id uuid references public.client_profiles (id) on delete set null,
  check (expires_at > created_at),
  check (status <> 'delivered' or delivered_at is not null),
  check (status <> 'verified' or verified_at is not null),
  check (status <> 'revoked' or revoked_at is not null)
);

create table public.data_use_consents (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects (id) on delete restrict,
  client_id uuid not null references public.client_profiles (id) on delete restrict,
  policy_version text not null check (char_length(trim(policy_version)) between 1 and 80),
  purposes text[] not null check (
    cardinality(purposes) > 0
    and 'project-operation' = any (purposes)
  ),
  status public.consent_status not null default 'active',
  accepted_at timestamptz not null default now(),
  withdrawn_at timestamptz,
  check (status <> 'withdrawn' or withdrawn_at is not null)
);

create table public.client_confirmations (
  id uuid primary key default gen_random_uuid(),
  revision_id uuid not null references public.revisions (id) on delete restrict,
  client_id uuid not null references public.client_profiles (id) on delete restrict,
  status public.client_confirmation_status not null,
  message text check (message is null or char_length(trim(message)) between 1 and 2000),
  confirmed_at timestamptz not null default now()
);

create index client_project_access_client_idx
  on public.client_project_access (client_id, project_id)
  where revoked_at is null;
create index client_invites_project_phone_idx
  on public.client_invites (project_id, phone_e164, created_at desc);
create index data_use_consents_project_client_idx
  on public.data_use_consents (project_id, client_id, accepted_at desc);
create index client_confirmations_revision_idx
  on public.client_confirmations (revision_id, confirmed_at desc);

create or replace function public.is_client_project_member(p_project_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.client_project_access access
    where access.project_id = p_project_id
      and access.client_id = auth.uid()
      and access.revoked_at is null
  );
$$;

alter table public.client_profiles enable row level security;
alter table public.client_project_access enable row level security;
alter table public.client_invites enable row level security;
alter table public.data_use_consents enable row level security;
alter table public.client_confirmations enable row level security;

create policy "clients read their profile" on public.client_profiles
  for select to authenticated using (id = auth.uid());

create policy "clients read their own project access" on public.client_project_access
  for select to authenticated using (client_id = auth.uid());

create policy "clients read their own consents" on public.data_use_consents
  for select to authenticated using (client_id = auth.uid());

create policy "clients record confirmation for an allowed revision" on public.client_confirmations
  for insert to authenticated with check (
    client_id = auth.uid()
    and exists (
      select 1
      from public.revisions revision
      where revision.id = revision_id
        and public.is_client_project_member(revision.project_id)
    )
  );

create policy "clients read their own confirmations" on public.client_confirmations
  for select to authenticated using (client_id = auth.uid());

-- Customer accounts do not receive direct policies on projects, revisions,
-- parts or files. A future presentation-specific read model/RPC must expose
-- only the approved illustrative data for a revision.

revoke all on function public.is_client_project_member(uuid) from public;
grant execute on function public.is_client_project_member(uuid) to authenticated;

comment on table public.client_profiles is 'Customer identities authenticated by Supabase Phone Auth; OTP values are never stored here.';
comment on table public.client_project_access is 'Customer access is project-scoped and revocable.';
comment on table public.data_use_consents is 'Versioned acceptance for project operation, authorized migration and governed product improvement.';
comment on table public.client_confirmations is 'Customer response to a specific revision; it is not commercial validation or technical release.';
