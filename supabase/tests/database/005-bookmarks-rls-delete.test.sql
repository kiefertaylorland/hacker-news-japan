begin;

select plan(4);

select tests.create_supabase_user('user-a@example.com') as user_a_id \gset
select tests.create_supabase_user('user-b@example.com') as user_b_id \gset

-- Seed as superuser (bypasses RLS).
insert into public.bookmarks (user_id, object_id, title, author, created_at_i)
values
  (:'user_a_id', 'story-a', 'Story A', 'author-a', 1000),
  (:'user_b_id', 'story-b', 'Story B', 'author-b', 1000);

select tests.clear_authentication();

select is_empty(
  $$ delete from public.bookmarks where object_id in ('story-a', 'story-b') returning 1 $$,
  'anon should not be able to delete any bookmark'
);

select tests.authenticate_as(:'user_a_id'::uuid);

select results_eq(
  format(
    $$ delete from public.bookmarks where user_id = %L returning object_id $$,
    :'user_a_id'
  ),
  $$ values ('story-a') $$,
  'authenticated user A should be able to delete their own bookmark'
);

-- Still authenticated as A: user B's row must be untouched.
select is_empty(
  format(
    $$ delete from public.bookmarks where user_id = %L returning 1 $$,
    :'user_b_id'
  ),
  'authenticated user A should not be able to delete user B''s bookmark'
);

-- Back to the superuser role (bypasses RLS) to verify B's row directly.
reset role;
select set_config('request.jwt.claims', '', true);

select results_eq(
  $$ select object_id from public.bookmarks $$,
  $$ values ('story-b') $$,
  'user B''s bookmark should still exist after user A''s attempted delete'
);

select * from finish();

rollback;
