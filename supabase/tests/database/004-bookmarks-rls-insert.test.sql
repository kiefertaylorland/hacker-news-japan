begin;

select plan(3);

select tests.create_supabase_user('user-a@example.com') as user_a_id \gset
select tests.create_supabase_user('user-b@example.com') as user_b_id \gset

select tests.clear_authentication();

select throws_ok(
  $$ insert into public.bookmarks (user_id, object_id, title, author, created_at_i)
     values ('00000000-0000-0000-0000-000000000000', 'story-anon', 'Anon Story', 'anon', 1000) $$,
  '42501',
  null,
  'anon should not be able to insert a bookmark'
);

select tests.authenticate_as(:'user_a_id'::uuid);

select lives_ok(
  format(
    $$ insert into public.bookmarks (user_id, object_id, title, author, created_at_i)
       values (%L, 'story-a', 'Story A', 'author-a', 1000) $$,
    :'user_a_id'
  ),
  'authenticated user A should be able to insert their own bookmark'
);

-- Still authenticated as A: attempting to insert a row claiming to be user B
-- must fail the `with check` clause, not just the `using` clause.
select throws_ok(
  format(
    $$ insert into public.bookmarks (user_id, object_id, title, author, created_at_i)
       values (%L, 'story-b', 'Story B', 'author-b', 1000) $$,
    :'user_b_id'
  ),
  '42501',
  null,
  'authenticated user A should not be able to insert a bookmark claiming to be user B'
);

select * from finish();

rollback;
