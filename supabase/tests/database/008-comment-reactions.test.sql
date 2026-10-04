begin;
set search_path = public, extensions, tests;
select plan(18);
select has_table('public', 'comment_votes', 'comment_votes table exists');
select has_table('public', 'comment_favorites', 'comment_favorites table exists');
select is((select relrowsecurity from pg_class where oid='public.comment_votes'::regclass), true, 'comment_votes RLS enabled');
select is((select relrowsecurity from pg_class where oid='public.comment_favorites'::regclass), true, 'comment_favorites RLS enabled');
select tests.create_supabase_user('reaction-owner@example.com') as owner \gset
select tests.create_supabase_user('reaction-other@example.com') as other \gset
insert into public.comments (story_id, user_id, author, body) values ('123', :'other', 'other', 'Hello') returning id as comment \gset
select tests.authenticate_as(:'owner'::uuid);
select lives_ok(format('insert into public.comment_votes (comment_id,user_id) values (%L,%L)', :'comment', :'owner'), 'owner can upvote a comment');
select lives_ok(format('insert into public.comment_votes (comment_id,user_id) values (%L,%L) on conflict (user_id,comment_id) do nothing', :'comment', :'owner'), 'duplicate upvotes are idempotent');
select is((select count(*)::integer from public.comment_votes), 1, 'one upvote per user and comment');
select throws_ok(format('insert into public.comment_votes (comment_id,user_id) values (%L,%L)', :'comment', :'other'), '42501', null, 'cannot upvote as another user');
select lives_ok(format('insert into public.comment_favorites (comment_id,user_id) values (%L,%L)', :'comment', :'owner'), 'owner can favorite a comment');
select throws_ok(format('insert into public.comment_favorites (comment_id,user_id) values (%L,%L)', :'comment', :'other'), '42501', null, 'cannot favorite as another user');
select is((select count(*)::integer from public.comment_favorites), 1, 'owner reads own favorite');
select tests.authenticate_as(:'other'::uuid);
select is_empty('select user_id from public.comment_votes', 'other users cannot read the owner upvote');
select is_empty('select user_id from public.comment_favorites', 'other users cannot read the owner favorite');
delete from public.comment_favorites;
select tests.authenticate_as(:'owner'::uuid);
select is((select count(*)::integer from public.comment_favorites), 1, 'other users cannot delete the owner favorite');
delete from public.comment_favorites where comment_id = :'comment';
select is_empty('select user_id from public.comment_favorites', 'owner can unfavorite');
select tests.clear_authentication();
select throws_ok(format('insert into public.comment_votes (comment_id,user_id) values (%L,%L)', :'comment', :'owner'), '42501', null, 'anonymous upvotes denied');
select throws_ok(format('insert into public.comment_favorites (comment_id,user_id) values (%L,%L)', :'comment', :'owner'), '42501', null, 'anonymous favorites denied');
reset role;
delete from public.comments where id = :'comment';
select is((select count(*)::integer from public.comment_votes), 0, 'deleting a comment removes its upvotes');
select * from finish();
rollback;
