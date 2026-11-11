-- RLS rehearsal for project/revision/parts/catalog/readiness synchronization.
-- Runs only against the LOCAL stack: `npx supabase test db`.
-- All identities below are synthetic fixtures; no customer data.
begin;
create extension if not exists pgtap with schema extensions;
set search_path = public, extensions;

select plan(41);

-- Synthetic identities ------------------------------------------------------
-- A: marceneiro + representante (owner); B: representante, added later;
-- C: marceneiro, added later; E: representante outside the project;
-- F: marceneiro outside the project; D: client; anon: visitor.
insert into auth.users (id, email) values
  ('aaaaaaaa-0000-4000-8000-000000000001', 'a@fixture.invalid'),
  ('bbbbbbbb-0000-4000-8000-000000000002', 'b@fixture.invalid'),
  ('cccccccc-0000-4000-8000-000000000003', 'c@fixture.invalid'),
  ('dddddddd-0000-4000-8000-000000000004', 'd@fixture.invalid'),
  ('eeeeeeee-0000-4000-8000-000000000005', 'e@fixture.invalid'),
  ('ffffffff-0000-4000-8000-000000000006', 'f@fixture.invalid');
insert into public.profiles (id, display_name, role) values
  ('aaaaaaaa-0000-4000-8000-000000000001', 'Fixture A', 'marceneiro'),
  ('bbbbbbbb-0000-4000-8000-000000000002', 'Fixture B', 'representante'),
  ('cccccccc-0000-4000-8000-000000000003', 'Fixture C', 'marceneiro'),
  ('eeeeeeee-0000-4000-8000-000000000005', 'Fixture E', 'representante'),
  ('ffffffff-0000-4000-8000-000000000006', 'Fixture F', 'marceneiro');
insert into public.profile_roles (profile_id, role) values
  ('aaaaaaaa-0000-4000-8000-000000000001', 'marceneiro'),
  ('aaaaaaaa-0000-4000-8000-000000000001', 'representante'),
  ('bbbbbbbb-0000-4000-8000-000000000002', 'representante'),
  ('cccccccc-0000-4000-8000-000000000003', 'marceneiro'),
  ('eeeeeeee-0000-4000-8000-000000000005', 'representante'),
  ('ffffffff-0000-4000-8000-000000000006', 'marceneiro');
insert into public.client_profiles (id, phone_e164) values
  ('dddddddd-0000-4000-8000-000000000004', '+5500000000000');

create function pg_temp.act_as(p_user uuid) returns void language sql as $$
  select set_config('request.jwt.claims', json_build_object('sub', p_user, 'role', 'authenticated')::text, true);
$$;

-- Owner flow, in the same order as the browser adapter -----------------------
set local role authenticated;
select pg_temp.act_as('aaaaaaaa-0000-4000-8000-000000000001');

select lives_ok($$ insert into projects (id, title, owner_id) values
  ('11111111-1111-4111-8111-111111111111', 'Projeto fixture', 'aaaaaaaa-0000-4000-8000-000000000001') $$,
  'owner creates project with reserved UUID');
select lives_ok($$ insert into project_members (project_id, user_id) values
  ('11111111-1111-4111-8111-111111111111', 'aaaaaaaa-0000-4000-8000-000000000001') $$,
  'owner adds self as member');
select throws_ok($$ insert into project_members (project_id, user_id) values
  ('11111111-1111-4111-8111-111111111111', 'aaaaaaaa-0000-4000-8000-000000000001') $$,
  '23505', null, 'membership retry returns unique violation handled by the adapter');
select lives_ok($$ insert into revisions (id, project_id, number, model, created_by) values
  ('22222222-2222-4222-8222-222222222221', '11111111-1111-4111-8111-111111111111', 1,
   '{"revision":{"number":1,"id":"revision-1"},"project":{"id":"p","title":"t"}}', 'aaaaaaaa-0000-4000-8000-000000000001') $$,
  'member creates R1');
select is((select model->'project'->>'id' from revisions where number = 1), 'p', 'owner reads own revision');
select lives_ok($$ insert into revisions (id, project_id, number, model, created_by) values
  ('22222222-2222-4222-8222-222222222222', '11111111-1111-4111-8111-111111111111', 2, '{}', 'aaaaaaaa-0000-4000-8000-000000000001') $$,
  'member creates R2 in the same remote project');
select throws_ok($$ insert into revisions (project_id, number, model, created_by) values
  ('11111111-1111-4111-8111-111111111111', 1, '{}', 'aaaaaaaa-0000-4000-8000-000000000001') $$,
  '23505', null, 'duplicate revision number is refused');
select throws_ok($$ insert into revisions (project_id, number, model, created_by) values
  ('11111111-1111-4111-8111-111111111111', 3, '{}', 'bbbbbbbb-0000-4000-8000-000000000002') $$,
  '42501', null, 'revision cannot be attributed to another user');
select lives_ok($$ insert into parts (revision_id, piece_code, name, quantity, length_mm, width_mm, thickness_mm, material) values
  ('22222222-2222-4222-8222-222222222221', 'BC-01', 'Lateral', 2, 720, 500, 18, 'MDF 18 mm'),
  ('22222222-2222-4222-8222-222222222221', 'BC-02', 'Tampo', 1, 764, 500, 18, 'MDF 18 mm') $$,
  'revision author inserts parts');
select is((select count(*)::int from parts where revision_id = '22222222-2222-4222-8222-222222222221'), 2, 'author reads parts');
select lives_ok($$ insert into catalog_items (project_id, local_id, code, name, kind, source_reference, created_by) values
  ('11111111-1111-4111-8111-111111111111', 'local-1', 'DOB-01', 'Dobradiça', 'hardware', 'fixture', 'aaaaaaaa-0000-4000-8000-000000000001') $$,
  'member creates catalog item');
select lives_ok($$ insert into readiness_checklists (revision_id, checklist, created_by) values
  ('22222222-2222-4222-8222-222222222221', '{"ready":false}', 'aaaaaaaa-0000-4000-8000-000000000001') $$,
  'member creates readiness checklist');

-- Immutability: no update/delete policy on revisions or parts.
update revisions set model = '{"tampered":true}' where id = '22222222-2222-4222-8222-222222222221';
select is((select model ? 'tampered' from revisions where id = '22222222-2222-4222-8222-222222222221'), false, 'revision update has no effect');
delete from parts where revision_id = '22222222-2222-4222-8222-222222222221';
select is((select count(*)::int from parts where revision_id = '22222222-2222-4222-8222-222222222221'), 2, 'parts delete has no effect');

-- Approval freezes parts; release requires the marceneiro role.
select lives_ok($$ select record_commercial_approval('22222222-2222-4222-8222-222222222221', 'whatsapp', 'fixture') $$,
  'owner with representante role records commercial approval');
select throws_ok($$ insert into parts (revision_id, piece_code, name, quantity, length_mm, width_mm, thickness_mm, material) values
  ('22222222-2222-4222-8222-222222222221', 'BC-03', 'Base', 1, 764, 500, 18, 'MDF 18 mm') $$,
  '42501', null, 'parts are frozen after commercial approval');
select throws_ok($$ select release_production('22222222-2222-4222-8222-222222222222', '{"ok":true}') $$,
  'P0001', 'Aprovação comercial ausente', 'release requires commercial approval');

-- Representante outside the project ------------------------------------------
select pg_temp.act_as('eeeeeeee-0000-4000-8000-000000000005');
select is((select count(*)::int from projects), 0, 'representative outside the project sees nothing');
select is((select count(*)::int from revisions) + (select count(*)::int from parts), 0, 'representative outside sees no revision or part');
select throws_ok($$ insert into project_members (project_id, user_id) values
  ('11111111-1111-4111-8111-111111111111', 'eeeeeeee-0000-4000-8000-000000000005') $$,
  '42501', null, 'representative outside the project cannot add self');
select is((select count(*)::int from profiles), 5, 'internal user lists the internal team');

-- Representante member adds teammates ----------------------------------------
select pg_temp.act_as('aaaaaaaa-0000-4000-8000-000000000001');
select lives_ok($$ insert into project_members (project_id, user_id) values
  ('11111111-1111-4111-8111-111111111111', 'bbbbbbbb-0000-4000-8000-000000000002') $$,
  'representative member (owner) adds another internal member');
select pg_temp.act_as('bbbbbbbb-0000-4000-8000-000000000002');
select is((select count(*)::int from projects), 1, 'added representative now sees the project');
select lives_ok($$ insert into project_members (project_id, user_id) values
  ('11111111-1111-4111-8111-111111111111', 'cccccccc-0000-4000-8000-000000000003') $$,
  'representative member adds a marceneiro');
select throws_ok($$ insert into project_members (project_id, user_id) values
  ('11111111-1111-4111-8111-111111111111', 'dddddddd-0000-4000-8000-000000000004') $$,
  '42501', null, 'customer cannot be added as internal member');
select pg_temp.act_as('cccccccc-0000-4000-8000-000000000003');
select throws_ok($$ insert into project_members (project_id, user_id) values
  ('11111111-1111-4111-8111-111111111111', 'eeeeeeee-0000-4000-8000-000000000005') $$,
  '42501', null, 'member without representante role cannot add members');

-- Marceneiro outside the project reads everything, writes nothing -------------
select pg_temp.act_as('ffffffff-0000-4000-8000-000000000006');
select is((select count(*)::int from projects), 1, 'marceneiro reads every project');
select is((select count(*)::int from revisions), 2, 'marceneiro reads every revision');
select is((select count(*)::int from parts), 2, 'marceneiro reads every part');
select is((select count(*)::int from catalog_items), 1, 'marceneiro reads every catalog item');
select is((select count(*)::int from readiness_checklists), 1, 'marceneiro reads every checklist');
select throws_ok($$ insert into project_members (project_id, user_id) values
  ('11111111-1111-4111-8111-111111111111', 'ffffffff-0000-4000-8000-000000000006') $$,
  '42501', null, 'non-member marceneiro cannot join by itself');
select throws_ok($$ insert into revisions (project_id, number, model, created_by) values
  ('11111111-1111-4111-8111-111111111111', 9, '{}', 'ffffffff-0000-4000-8000-000000000006') $$,
  '42501', null, 'non-member marceneiro cannot add revisions');
select throws_ok($$ insert into projects (title, owner_id) values ('Fake', 'aaaaaaaa-0000-4000-8000-000000000001') $$,
  '42501', null, 'cannot create project on behalf of another owner');
select throws_ok($$ select release_production('22222222-2222-4222-8222-222222222221', '{"ok":true}') $$,
  'P0001', 'Revisão não encontrada ou sem acesso', 'marceneiro outside the project cannot release');

-- Representative-only member -------------------------------------------------
select pg_temp.act_as('bbbbbbbb-0000-4000-8000-000000000002');
select throws_ok($$ select release_production('22222222-2222-4222-8222-222222222221', '{"ok":true}') $$,
  'P0001', 'Somente o marceneiro pode liberar produção', 'representative cannot release production');

-- Client account: no direct technical access ---------------------------------
select pg_temp.act_as('dddddddd-0000-4000-8000-000000000004');
select is((select count(*)::int from projects) + (select count(*)::int from revisions) + (select count(*)::int from parts), 0,
  'client has no direct access to projects, revisions or parts');
select is((select count(*)::int from profiles), 0, 'client cannot list the internal team');

-- Anonymous visitor ----------------------------------------------------------
reset role;
set local role anon;
select set_config('request.jwt.claims', '{"role":"anon"}', true);
select is((select count(*)::int from projects), 0, 'anon sees no project');
select is((select count(*)::int from revisions), 0, 'anon sees no revision');
select is((select count(*)::int from get_shared_revision('not-a-valid-token')), 0, 'invalid share token returns nothing');

reset role;
select * from finish();
rollback;
