-- Rule confirmed on 10/11/2026: any marceneiro member may release a revision;
-- pending or blocked checklist items require a written justification.
-- Replaces release_production keeping its signature and grants.

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
  target_project_id uuid;
  target_number integer;
begin
  if not public.has_internal_role('marceneiro') then
    raise exception 'Somente o marceneiro pode liberar produção';
  end if;
  select revision.project_id, revision.number into target_project_id, target_number
  from public.revisions revision
  where revision.id = p_revision_id and public.is_project_member(revision.project_id);
  if target_project_id is null then
    raise exception 'Revisão não encontrada ou sem acesso';
  end if;
  if not exists (select 1 from public.commercial_approvals where revision_id = p_revision_id) then
    raise exception 'Aprovação comercial ausente';
  end if;
  if jsonb_typeof(p_checklist_snapshot) <> 'object'
    or p_checklist_snapshot->>'format' is distinct from 'rayzen-technical-release'
    or jsonb_typeof(p_checklist_snapshot->'items') is distinct from 'array'
    or jsonb_array_length(p_checklist_snapshot->'items') = 0 then
    raise exception 'Checklist técnico obrigatório';
  end if;
  if (p_checklist_snapshot->>'revisionNumber')::integer is distinct from target_number then
    raise exception 'O checklist pertence a outra revisão';
  end if;
  if exists (
    select 1 from jsonb_array_elements(p_checklist_snapshot->'items') item
    where item->>'status' is distinct from 'ok'
  ) and coalesce(char_length(trim(p_checklist_snapshot->>'justification')), 0) = 0 then
    raise exception 'Justificativa obrigatória para itens pendentes ou bloqueados';
  end if;

  insert into public.production_releases (revision_id, released_by, checklist_snapshot)
  values (p_revision_id, auth.uid(), p_checklist_snapshot)
  returning id into release_id;

  insert into public.audit_events (project_id, revision_id, actor_id, event_type, details)
  values (target_project_id, p_revision_id, auth.uid(), 'production.released',
    jsonb_build_object('release_id', release_id, 'justified', p_checklist_snapshot->>'justification' is not null));
  return release_id;
end;
$$;
