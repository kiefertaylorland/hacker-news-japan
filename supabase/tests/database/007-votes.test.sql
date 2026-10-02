begin;
set search_path = public, extensions, tests;
select plan(9);
select has_table('public', 'votes', 'votes table exists');
select is((select relrowsecurity from pg_class where oid='public.votes'::regclass), true, 'RLS enabled');
select tests.create_supabase_user('vote-owner@example.com') as owner \gset
select tests.create_supabase_user('vote-other@example.com') as other \gset
select tests.authenticate_as(:'owner'::uuid);
select lives_ok(format('insert into public.votes (story_id,user_id) values (''123'',%L)', :'owner'), 'owner can vote');
select lives_ok(format('insert into public.votes (story_id,user_id) values (''123'',%L) on conflict (user_id,story_id) do nothing', :'owner'), 'duplicate requests are idempotent');
select is((select count(*)::integer from public.votes where story_id='123'), 1, 'one vote per user and story');
select throws_ok(format('insert into public.votes (story_id,user_id) values (''123'',%L)', :'other'), '42501', null, 'cannot vote as another user');
select throws_ok('update public.votes set story_id=''456''', '42501', null, 'updates denied');
select tests.clear_authentication();
select is((select count(*)::integer from public.votes where story_id='123'), 1, 'anonymous users can count votes');
select throws_ok(format('insert into public.votes (story_id,user_id) values (''123'',%L)', :'owner'), '42501', null, 'anonymous writes denied');
select * from finish();
rollback;
