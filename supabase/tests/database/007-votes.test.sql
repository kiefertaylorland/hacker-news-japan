begin;
set search_path = public, extensions, tests;
select plan(16);
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
select tests.authenticate_as(:'other'::uuid);
select is_empty('select user_id from public.votes', 'other users cannot read the owner vote');
select lives_ok(format('insert into public.votes (story_id,user_id) values (''123'',%L)', :'other'), 'another user can vote on the same story');
select is(public.story_vote_count('123'), 2::bigint, 'signed-in readers see votes from all users');
select tests.clear_authentication();
select is_empty('select user_id from public.votes', 'anonymous users cannot read voter identities');
select is(public.story_vote_count('123'), 2::bigint, 'anonymous users can count votes');
select is(public.story_vote_count('456'), 0::bigint, 'stories without votes have a zero count');
select results_eq('select story_id, count from public.story_vote_counts(array[''123'',''456''])', $$values ('123'::text, 2::bigint)$$, 'anonymous users can batch-count votes; stories without votes are omitted');
select is_empty('select * from public.story_vote_counts(array[]::text[])', 'empty batches return no counts');
select throws_ok(format('insert into public.votes (story_id,user_id) values (''123'',%L)', :'owner'), '42501', null, 'anonymous writes denied');
select * from finish();
rollback;
