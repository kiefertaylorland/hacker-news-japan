begin;
set search_path = public, extensions, tests;
select plan(8);
select has_table('public', 'comments', 'comments table exists');
select is((select relrowsecurity from pg_class where oid='public.comments'::regclass), true, 'RLS enabled');
select tests.create_supabase_user('comment-owner@example.com') as owner \gset
select tests.create_supabase_user('comment-other@example.com') as other \gset
select tests.authenticate_as(:'owner'::uuid);
select lives_ok(format('insert into public.comments (story_id,user_id,author,body) values (''123'',%L,''author'',''Hello'')', :'owner'), 'owner can post');
select throws_ok(format('insert into public.comments (story_id,user_id,author,body) values (''123'',%L,''author'',''Spoof'')', :'other'), '42501', null, 'cannot impersonate another user');
select throws_ok(format('insert into public.comments (story_id,user_id,author,body) values (''123'',%L,''author'','' '')', :'owner'), '23514', null, 'blank comments rejected');
select throws_ok('update public.comments set body=''modified''', '42501', null, 'updates denied');
select tests.clear_authentication();
select is((select count(*)::integer from public.comments where story_id='123'), 1, 'anonymous users can read comments');
select throws_ok(format('insert into public.comments (story_id,user_id,author,body) values (''123'',%L,''author'',''Anon'')', :'owner'), '42501', null, 'anonymous writes denied');
select * from finish();
rollback;
