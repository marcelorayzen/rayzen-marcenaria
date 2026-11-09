-- Internal users may hold more than one responsibility.
-- Keep profiles.role for backward compatibility while profile_roles becomes
-- the authority used by role gates and future provisioning tools.

create table public.profile_roles (
  profile_id uuid not null references public.profiles (id) on delete cascade,
  role public.internal_role not null,
  created_at timestamptz not null default now(),
  primary key (profile_id, role)
);

insert into public.profile_roles (profile_id, role)
select id, role from public.profiles
on conflict (profile_id, role) do nothing;

alter table public.profile_roles enable row level security;

create policy "internal users read their role assignments" on public.profile_roles
  for select to authenticated using (profile_id = auth.uid());

create or replace function public.has_internal_role(p_role public.internal_role)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.profile_roles assignment
    where assignment.profile_id = auth.uid() and assignment.role = p_role
  );
$$;

comment on table public.profile_roles is 'Internal responsibilities; a profile may have multiple roles.';
