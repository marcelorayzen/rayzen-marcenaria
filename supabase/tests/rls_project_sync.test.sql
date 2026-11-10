-- RLS rehearsal for project/revision/parts/catalog/readiness synchronization.
-- Runs only against the LOCAL stack: `npx supabase test db`.
-- All identities below are synthetic fixtures; no customer data.
begin;
create extension if not exists pgtap with schema extensions;
set search_path = public, extensions;

select plan(33);

-- Synthetic identities ------------------------------------------------------
-- A: marceneiro + representante (owner); B: representante only;
-- C: internal profile without project membership; D: client; anon: visitor.
insert into auth.users (id, email) values
  ('aaaaaaaa-0000-4000-8000-000000000001', 'a@fixture.invalid'),
  ('bbbbbbbb-0000-4000-8000-000000000002', 'b@fixture.invalid'),
  ('cccccccc-0000-4000-8000-000000000003', 'c@fixture.invalid'),
  ('dddddddd-0000-4000-8000-000000000004', 'd@fixture.invalid');
insert into public.profiles (id, display_name, role) values
  ('aaaaaaaa-0000-4000-8000-000000000001', 'Fixture A', 'marceneiro'),
  ('bbbbbbbb-0000-4000-8000-000000000002', 'Fixture B', 'representante'),
  ('cccccccc-0000-4000-8000-000000000003', 'Fixture C', 'marceneiro');
insert into public.profile_roles (profile_id, role) values
  ('aaaaaaaa-0000-4000-8000-000000000001', 'marceneiro'),
  ('aaaaaaaa-0000-4000-8000-000000000001', 'representante'),
  ('bbbbbbbb-0000-4000-8000-000000000002', 'representante'),
  ('cccccccc-0000-4000-8000-000000000003', 'marceneiro');
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
-- Documented gap: no policy lets an owner add a teammate; sharing needs a decision.
select throws_ok($$ insert into project_members (project_id, user_id) values
  ('11111111-1111-4111-8111-111111111111', 'bbbbbbbb-0000-4000-8000-000000000002') $$,
  '42501', null, 'GAP: owner cannot add another internal member yet');

-- Internal user without membership --------------------------------------------
select pg_temp.act_as('cccccccc-0000-4000-8000-000000000003');
select is((select count(*)::int from projects), 0, 'non-member sees no project');
select is((select count(*)::int from revisions), 0, 'non-member sees no revision');
select is((select count(*)::int from parts), 0, 'non-member sees no part');
select is((select count(*)::int from catalog_items), 0, 'non-member sees no catalog item');
select is((select count(*)::int from readiness_checklists), 0, 'non-member sees no checklist');
select throws_ok($$ insert into project_members (project_id, user_id) values
  ('11111111-1111-4111-8111-111111111111', 'cccccccc-0000-4000-8000-000000000003') $$,
  '42501', null, 'non-member cannot join another owner project');
select throws_ok($$ insert into revisions (project_id, number, model, created_by) values
  ('11111111-1111-4111-8111-111111111111', 9, '{}', 'cccccccc-0000-4000-8000-000000000003') $$,
  '42501', null, 'non-member cannot add revisions');
select throws_ok($$ insert into projects (title, owner_id) values ('Fake', 'aaaaaaaa-0000-4000-8000-000000000001') $$,
  '42501', null, 'cannot create project on behalf of another owner');
select throws_ok($$ select release_production('22222222-2222-4222-8222-222222222221', '{"ok":true}') $$,
  'P0001', 'Revisão não encontrada ou sem acesso', 'marceneiro outside the project cannot release');

-- Representative-only user ---------------------------------------------------
select pg_temp.act_as('bbbbbbbb-0000-4000-8000-000000000002');
select is((select count(*)::int from projects), 0, 'representative outside the project sees nothing');
select throws_ok($$ select release_production('22222222-2222-4222-8222-222222222221', '{"ok":true}') $$,
  'P0001', 'Somente o marceneiro pode liberar produção', 'representative cannot release production');

-- Client account: no direct technical access ---------------------------------
select pg_temp.act_as('dddddddd-0000-4000-8000-000000000004');
select is((select count(*)::int from projects) + (select count(*)::int from revisions) + (select count(*)::int from parts), 0,
  'client has no direct access to projects, revisions or parts');

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
