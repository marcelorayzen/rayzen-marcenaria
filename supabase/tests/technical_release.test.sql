-- Commercial approval and technical release rules. LOCAL stack only.
-- Synthetic identities; no customer data.
begin;
create extension if not exists pgtap with schema extensions;
set search_path = public, extensions;

select plan(16);

-- A: marceneiro member; B: representante member; C: marceneiro + representante
-- outside the project.
insert into auth.users (id, email) values
  ('aaaaaaaa-0000-4000-8000-0000000000a1', 'ra@fixture.invalid'),
  ('bbbbbbbb-0000-4000-8000-0000000000b2', 'rb@fixture.invalid'),
  ('cccccccc-0000-4000-8000-0000000000c3', 'rc@fixture.invalid');
insert into public.profiles (id, display_name, role) values
  ('aaaaaaaa-0000-4000-8000-0000000000a1', 'Release A', 'marceneiro'),
  ('bbbbbbbb-0000-4000-8000-0000000000b2', 'Release B', 'representante'),
  ('cccccccc-0000-4000-8000-0000000000c3', 'Release C', 'marceneiro');
insert into public.profile_roles (profile_id, role) values
  ('aaaaaaaa-0000-4000-8000-0000000000a1', 'marceneiro'),
  ('bbbbbbbb-0000-4000-8000-0000000000b2', 'representante'),
  ('cccccccc-0000-4000-8000-0000000000c3', 'marceneiro'),
  ('cccccccc-0000-4000-8000-0000000000c3', 'representante');
insert into public.projects (id, title, owner_id) values
  ('33333333-3333-4333-8333-333333333333', 'Liberação fixture', 'bbbbbbbb-0000-4000-8000-0000000000b2');
insert into public.project_members (project_id, user_id) values
  ('33333333-3333-4333-8333-333333333333', 'aaaaaaaa-0000-4000-8000-0000000000a1'),
  ('33333333-3333-4333-8333-333333333333', 'bbbbbbbb-0000-4000-8000-0000000000b2');
insert into public.revisions (id, project_id, number, model, created_by) values
  ('44444444-4444-4444-8444-444444444441', '33333333-3333-4333-8333-333333333333', 1, '{}', 'bbbbbbbb-0000-4000-8000-0000000000b2'),
  ('44444444-4444-4444-8444-444444444442', '33333333-3333-4333-8333-333333333333', 2, '{}', 'bbbbbbbb-0000-4000-8000-0000000000b2');

create function pg_temp.act_as(p_user uuid) returns void language sql as $$
  select set_config('request.jwt.claims', json_build_object('sub', p_user, 'role', 'authenticated')::text, true);
$$;

set local role authenticated;

-- Commercial approval -------------------------------------------------------
select pg_temp.act_as('aaaaaaaa-0000-4000-8000-0000000000a1');
select throws_ok($$ select record_commercial_approval('44444444-4444-4444-8444-444444444441', 'whatsapp', 'fixture') $$,
  'P0001', 'Somente o representante pode registrar aprovação comercial', 'marceneiro alone cannot approve commercially');
select throws_ok($$ select release_production('44444444-4444-4444-8444-444444444441',
  '{"format":"rayzen-technical-release","revisionNumber":1,"items":[{"id":"x","status":"ok"}],"justification":null}') $$,
  'P0001', 'Aprovação comercial ausente', 'release requires prior commercial approval');

select pg_temp.act_as('cccccccc-0000-4000-8000-0000000000c3');
select throws_ok($$ select record_commercial_approval('44444444-4444-4444-8444-444444444441', 'whatsapp', 'fixture') $$,
  'P0001', 'Revisão não encontrada ou sem acesso', 'representante outside the project cannot approve');

select pg_temp.act_as('bbbbbbbb-0000-4000-8000-0000000000b2');
select lives_ok($$ select record_commercial_approval('44444444-4444-4444-8444-444444444441', 'whatsapp', 'Cliente confirmou por WhatsApp') $$,
  'representante member records approval of R1');
select throws_ok($$ select record_commercial_approval('44444444-4444-4444-8444-444444444441', 'whatsapp', 'again') $$,
  '23505', null, 'a revision has a single commercial approval');
select throws_ok($$ select release_production('44444444-4444-4444-8444-444444444441',
  '{"format":"rayzen-technical-release","revisionNumber":1,"items":[{"id":"x","status":"ok"}],"justification":null}') $$,
  'P0001', 'Somente o marceneiro pode liberar produção', 'representante cannot release');

-- Release checklist rules -----------------------------------------------------
select pg_temp.act_as('cccccccc-0000-4000-8000-0000000000c3');
select throws_ok($$ select release_production('44444444-4444-4444-8444-444444444441',
  '{"format":"rayzen-technical-release","revisionNumber":1,"items":[{"id":"x","status":"ok"}],"justification":null}') $$,
  'P0001', 'Revisão não encontrada ou sem acesso', 'marceneiro outside the project cannot release');

select pg_temp.act_as('aaaaaaaa-0000-4000-8000-0000000000a1');
select throws_ok($$ select release_production('44444444-4444-4444-8444-444444444441', '{"ok":true}') $$,
  'P0001', 'Checklist técnico obrigatório', 'unknown checklist format is refused');
select throws_ok($$ select release_production('44444444-4444-4444-8444-444444444441',
  '{"format":"rayzen-technical-release","revisionNumber":2,"items":[{"id":"x","status":"ok"}],"justification":null}') $$,
  'P0001', 'O checklist pertence a outra revisão', 'checklist of another revision is refused');
select throws_ok($$ select release_production('44444444-4444-4444-8444-444444444441',
  '{"format":"rayzen-technical-release","revisionNumber":1,"items":[{"id":"x","status":"pending"}],"justification":"  "}') $$,
  'P0001', 'Justificativa obrigatória para itens pendentes ou bloqueados', 'pending item without justification is refused');
select lives_ok($$ select release_production('44444444-4444-4444-8444-444444444441',
  '{"format":"rayzen-technical-release","revisionNumber":1,"items":[{"id":"x","status":"pending"}],"justification":"Conferido na obra"}') $$,
  'marceneiro member releases with justification');
select is((select count(*)::int from production_releases where revision_id = '44444444-4444-4444-8444-444444444441'), 1,
  'release is visible to the project');
select is((select checklist_snapshot->>'justification' from production_releases where revision_id = '44444444-4444-4444-8444-444444444441'),
  'Conferido na obra', 'justification is stored with the release');
select is((select count(*)::int from audit_events where event_type = 'production.released'), 1, 'release is audited');
select throws_ok($$ select release_production('44444444-4444-4444-8444-444444444441',
  '{"format":"rayzen-technical-release","revisionNumber":1,"items":[{"id":"x","status":"ok"}],"justification":null}') $$,
  '23505', null, 'a revision is released only once');

-- A new revision does not inherit approval or release.
select throws_ok($$ select release_production('44444444-4444-4444-8444-444444444442',
  '{"format":"rayzen-technical-release","revisionNumber":2,"items":[{"id":"x","status":"ok"}],"justification":null}') $$,
  'P0001', 'Aprovação comercial ausente', 'R2 needs its own commercial approval');

reset role;
select * from finish();
rollback;
