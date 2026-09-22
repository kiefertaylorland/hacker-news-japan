begin;

select plan(2);

-- Seed as superuser (bypasses RLS) so the fixture setup itself isn't testing anything.
select tests.create_supabase_user('user-a@example.com') as user_a_id \gset
select tests.create_supabase_user('user-b@example.com') as user_b_id \gset

insert into public.bookmarks (user_id, object_id, title, author, created_at_i)
values
  (:'user_a_id', 'story-a', 'Story A', 'author-a', 1000),
  (:'user_b_id', 'story-b', 'Story B', 'author-b', 1000);

select tests.clear_authentication();

select is_empty(
  $$ select * from public.bookmarks $$,
  'anon should see no bookmarks'
);

select tests.authenticate_as(:'user_a_id'::uuid);

select results_eq(
  $$ select object_id from public.bookmarks order by object_id $$,
  $$ values ('story-a') $$,
  'authenticated user A should only see their own bookmark, not user B''s'
);

select * from finish();

rollback;
