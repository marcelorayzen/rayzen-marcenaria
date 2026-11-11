-- Access decisions confirmed on 10/11/2026:
-- * every marceneiro reads every project (to reuse solutions across projects);
-- * a representante who is a member of a project adds internal members to it.
-- Additive only: existing policies stay; Postgres ORs permissive policies.
-- Writing revisions/parts and releasing production still require membership.

create or replace function public.is_internal_user()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (select 1 from public.profiles profile where profile.id = auth.uid());
$$;

revoke all on function public.is_internal_user() from public;
grant execute on function public.is_internal_user() to authenticated;

-- Internal users can list the internal team (needed to choose a member).
-- Customers have no profile row, so they see nobody.
create policy "internal users read internal profiles" on public.profiles
  for select to authenticated using (public.is_internal_user());

-- Marceneiro read access across all projects.
create policy "marceneiros read all projects" on public.projects
  for select to authenticated using (public.has_internal_role('marceneiro'));
create policy "marceneiros read all memberships" on public.project_members
  for select to authenticated using (public.has_internal_role('marceneiro'));
create policy "marceneiros read all revisions" on public.revisions
  for select to authenticated using (public.has_internal_role('marceneiro'));
create policy "marceneiros read all parts" on public.parts
  for select to authenticated using (public.has_internal_role('marceneiro'));
create policy "marceneiros read all catalog items" on public.catalog_items
  for select to authenticated using (public.has_internal_role('marceneiro'));
create policy "marceneiros read all readiness checklists" on public.readiness_checklists
  for select to authenticated using (public.has_internal_role('marceneiro'));
create policy "marceneiros read all commercial approvals" on public.commercial_approvals
  for select to authenticated using (public.has_internal_role('marceneiro'));
create policy "marceneiros read all production releases" on public.production_releases
  for select to authenticated using (public.has_internal_role('marceneiro'));
create policy "marceneiros read all project files" on storage.objects
  for select to authenticated using (
    bucket_id = 'project-files' and public.has_internal_role('marceneiro')
  );

-- Representante members add other internal users to the project.
create policy "representative members add internal members" on public.project_members
  for insert to authenticated with check (
    public.has_internal_role('representante')
    and public.is_project_member(project_id)
    and exists (select 1 from public.profiles profile where profile.id = user_id)
  );

comment on function public.is_internal_user() is 'True when the session belongs to an internal profile (not a customer).';
